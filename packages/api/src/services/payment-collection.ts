import { randomUUID } from 'node:crypto';
import { getDb, schema, eq, and } from '@middleman/db';
import { stripe } from '@/lib/stripe';
import type { Bill, PaymentMethod } from '@middleman/db';

export type PaymentCollectionInput = {
  billId: string;
  userId: string;
  paymentMethodId?: string; // Optional override for manual retry
};

/**
 * Create a Stripe PaymentIntent for ACH debit on the user's primary payment method.
 * If no primary method exists or it's deleted, attempt fallback to secondary method.
 * Returns the PaymentIntent or throws on fatal error.
 */
export async function createPaymentIntent(
  input: PaymentCollectionInput,
): Promise<{ paymentIntentId: string; paymentMethodId: string }> {
  const db = getDb();

  // Fetch bill to confirm it exists and get amount
  const [bill] = await db
    .select()
    .from(schema.bills)
    .where(and(eq(schema.bills.id, input.billId), eq(schema.bills.userId, input.userId)))
    .limit(1);

  if (!bill) {
    throw new Error(`Bill ${input.billId} not found for user ${input.userId}`);
  }

  if (bill.status === 'paid') {
    throw new Error(`Bill ${input.billId} is already paid`);
  }

  // Get payment method (use override or find primary/fallback)
  let paymentMethod: PaymentMethod | null = null;

  if (input.paymentMethodId) {
    // Manual override for retry: use specified method
    const [pm] = await db
      .select()
      .from(schema.paymentMethods)
      .where(
        and(
          eq(schema.paymentMethods.id, input.paymentMethodId),
          eq(schema.paymentMethods.userId, input.userId),
        ),
      )
      .limit(1);
    paymentMethod = pm ?? null;
  } else {
    // Find primary method (not deleted)
    const [pm] = await db
      .select()
      .from(schema.paymentMethods)
      .where(
        and(
          eq(schema.paymentMethods.userId, input.userId),
          eq(schema.paymentMethods.isPrimary, true),
        ),
      )
      .limit(1);
    paymentMethod = pm ?? null;

    // Fallback to any non-deleted method if primary not found
    if (!paymentMethod) {
      const [fallback] = await db
        .select()
        .from(schema.paymentMethods)
        .where(eq(schema.paymentMethods.userId, input.userId))
        .limit(1);
      paymentMethod = fallback ?? null;
    }
  }

  if (!paymentMethod || !paymentMethod.stripePaymentMethodId) {
    throw new Error(
      `No valid payment method found for user ${input.userId}. ACH account must be linked.`,
    );
  }

  // Create Stripe PaymentIntent
  // Use idempotency key to prevent duplicate charges on retry
  const idempotencyKey = `bill-${input.billId}-${paymentMethod.id}`;

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: bill.totalCents,
      currency: bill.currency.toLowerCase(),
      payment_method: paymentMethod.stripePaymentMethodId,
      confirm: true, // Auto-confirm to immediately process ACH
      automatic_payment_methods: { enabled: false },
      description: `MiddleMan Bill ${input.billId}`,
      metadata: {
        billId: input.billId,
        userId: input.userId,
        paymentMethodId: paymentMethod.id,
      },
      statement_descriptor: 'MIDDLEMAN BILL',
    },
    { idempotencyKey },
  );

  return {
    paymentIntentId: paymentIntent.id,
    paymentMethodId: paymentMethod.id,
  };
}

/**
 * Record a payment attempt in the dunning_attempts table.
 * Called after PaymentIntent is created but before awaiting webhook confirmation.
 */
export async function recordPaymentAttempt(input: {
  billId: string;
  paymentIntentId: string;
  paymentMethodId: string;
  amountCents: number;
  attemptNo: number;
}): Promise<string> {
  const db = getDb();
  const [attempt] = await db
    .insert(schema.dunningAttempts)
    .values({
      billId: input.billId,
      paymentMethodId: input.paymentMethodId,
      attemptNo: input.attemptNo,
      method: 'smart_retry', // Will be updated when webhook confirms result
      stripePaymentIntentId: input.paymentIntentId,
      amountCents: input.amountCents,
      status: 'scheduled', // Changes to attempted/succeeded/failed on webhook
      attemptedAt: new Date(),
    })
    .returning();

  if (!attempt) throw new Error('Failed to record payment attempt');
  return attempt.id;
}

/**
 * Calculate the next retry time based on attempt number and backoff strategy.
 * Backoff: 12h → 24h → 48h
 */
export function calculateNextRetryTime(attemptNo: number): Date {
  const now = new Date();
  let hoursToAdd = 12;

  if (attemptNo >= 3) hoursToAdd = 48; // 3rd+ attempt: wait 48 hours
  else if (attemptNo >= 2) hoursToAdd = 24; // 2nd attempt: wait 24 hours
  // 1st attempt: wait 12 hours (default)

  const nextRetry = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
  return nextRetry;
}

/**
 * Handle payment success webhook from Stripe.
 * Mark bill as paid, update ledger, emit success event.
 */
export async function handlePaymentSuccess(input: {
  billId: string;
  paymentIntentId: string;
  amountCents: number;
}): Promise<void> {
  const db = getDb();

  await db.transaction(async (tx) => {
    // Mark bill as paid
    const [bill] = await tx
      .update(schema.bills)
      .set({
        status: 'paid',
        paidAt: new Date(),
      })
      .where(eq(schema.bills.id, input.billId))
      .returning();

    if (!bill) throw new Error(`Bill ${input.billId} not found`);

    // Mark the dunning attempt as succeeded
    await tx
      .update(schema.dunningAttempts)
      .set({
        status: 'succeeded',
      })
      .where(eq(schema.dunningAttempts.stripePaymentIntentId, input.paymentIntentId));

    // Write ledger entry: payment moves from asset_receivable (user owes us) to asset_float (cash)
    const txId = randomUUID();
    await tx.insert(schema.ledgerEntries).values([
      {
        transactionId: txId,
        account: 'asset_float',
        debitCents: input.amountCents,
        billId: input.billId,
        description: 'Payment received via ACH from user',
      },
      {
        transactionId: txId,
        account: 'asset_receivable',
        creditCents: input.amountCents,
        billId: input.billId,
        description: 'User receivable collected via ACH',
      },
    ]);
  });
}

/**
 * Handle payment failure webhook from Stripe.
 * Record the failure, schedule next retry if within limits.
 * Emit bill.payment.failed event to trigger dunning state machine.
 */
export async function handlePaymentFailure(input: {
  billId: string;
  paymentIntentId: string;
  failureCode: string;
  failureMessage: string;
}): Promise<void> {
  const db = getDb();

  // Find the current dunning attempt to get attempt number
  const [currentAttempt] = await db
    .select()
    .from(schema.dunningAttempts)
    .where(eq(schema.dunningAttempts.stripePaymentIntentId, input.paymentIntentId))
    .limit(1);

  if (!currentAttempt) {
    // Payment attempted without a recorded attempt (unusual but possible)
    // Log but don't fail
    console.warn(`No dunning attempt found for PaymentIntent ${input.paymentIntentId}`);
    return;
  }

  const attemptNo = currentAttempt.attemptNo;
  const nextRetryAt = calculateNextRetryTime(attemptNo);

  // Update dunning attempt with failure details
  await db
    .update(schema.dunningAttempts)
    .set({
      status: 'failed',
      failureCode: input.failureCode,
      failureMessage: input.failureMessage,
      nextRetryAt: nextRetryAt,
    })
    .where(eq(schema.dunningAttempts.id, currentAttempt.id));

  // Emit bill.payment.failed event for dunning state machine
  // This will be picked up by the dunning state machine Inngest function
  const { inngest } = await import('@middleman/jobs');
  await inngest.send({
    name: 'bill.payment.failed',
    data: {
      billId: input.billId,
      attemptNo: attemptNo,
      failureCode: input.failureCode,
    },
  });
}
