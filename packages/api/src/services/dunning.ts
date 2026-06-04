import { randomUUID } from 'node:crypto';
import { getDb, schema, eq, and, gte } from '@middleman/db';
import { stripe } from '@/lib/stripe';
import { inngest } from '@middleman/jobs';
import type { Bill, DunningAttempt } from '@middleman/db';

const LATE_FEE_CENTS = 1500; // $15.00
const LATE_FEE_ASSESSMENT_THRESHOLD_ATTEMPTS = 3; // Assess after 3 failed attempts
const OPS_ESCALATION_THRESHOLD_ATTEMPTS = 5; // Escalate after 5 failed attempts
const OPS_ESCALATION_DAYS_OVERDUE = 7; // OR if 7+ days overdue

/**
 * Assess a late fee on a bill if not already assessed.
 * Late fees are assessed once, after 3 failed attempts or day 3+ overdue.
 * Returns true if fee was newly assessed, false if already present.
 */
export async function assessLateFee(billId: string): Promise<boolean> {
  const db = getDb();

  const [bill] = await db
    .select()
    .from(schema.bills)
    .where(eq(schema.bills.id, billId))
    .limit(1);

  if (!bill) throw new Error(`Bill ${billId} not found`);

  // If late fee already assessed, skip
  if (bill.lateFeeCents > 0) {
    return false;
  }

  // Apply late fee in transaction
  await db.transaction(async (tx) => {
    // Update bill: add late fee to total
    await tx
      .update(schema.bills)
      .set({
        lateFeeCents: LATE_FEE_CENTS,
        totalCents: bill.totalCents + LATE_FEE_CENTS,
        status: 'past_due',
      })
      .where(eq(schema.bills.id, billId));

    // Create line item for late fee
    await tx.insert(schema.billLineItems).values({
      billId,
      type: 'late_fee',
      description: 'Late fee — payment past due',
      amountCents: LATE_FEE_CENTS,
    });

    // Write ledger: late fee is immediate revenue
    const txId = randomUUID();
    await tx.insert(schema.ledgerEntries).values([
      {
        transactionId: txId,
        account: 'asset_receivable',
        debitCents: LATE_FEE_CENTS,
        billId,
        description: 'Late fee assessed',
      },
      {
        transactionId: txId,
        account: 'revenue_late',
        creditCents: LATE_FEE_CENTS,
        billId,
        description: 'Late fee revenue',
      },
    ]);
  });

  // Emit event for notifications to pick up
  await inngest.send({
    name: 'bill.late_fee_assessed',
    data: { billId, lateFeeCents: LATE_FEE_CENTS },
  });

  return true;
}

/**
 * Get or create a fallback payment method for a user.
 * Falls back to secondary method marked isFallback, or any non-primary method.
 */
export async function getFallbackPaymentMethod(userId: string) {
  const db = getDb();

  // Try to find explicitly marked fallback
  const [fallback] = await db
    .select()
    .from(schema.paymentMethods)
    .where(
      and(eq(schema.paymentMethods.userId, userId), eq(schema.paymentMethods.isFallback, true)),
    )
    .limit(1);

  if (fallback && !fallback.deletedAt) return fallback;

  // Fall back to any non-primary, non-deleted method
  const [secondary] = await db
    .select()
    .from(schema.paymentMethods)
    .where(
      and(
        eq(schema.paymentMethods.userId, userId),
        eq(schema.paymentMethods.isPrimary, false),
      ),
    )
    .limit(1);

  return secondary && !secondary.deletedAt ? secondary : null;
}

/**
 * Attempt payment via fallback method.
 * Creates a new Stripe PaymentIntent against the fallback method.
 * Returns PaymentIntent ID or throws on error.
 */
export async function attemptFallbackPayment(input: {
  billId: string;
  userId: string;
  amountCents: number;
}): Promise<string> {
  const db = getDb();

  // Get fallback payment method
  const fallbackMethod = await getFallbackPaymentMethod(input.userId);
  if (!fallbackMethod?.stripePaymentMethodId) {
    throw new Error(`No fallback payment method found for user ${input.userId}`);
  }

  // Create PaymentIntent against fallback method
  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: input.amountCents,
      currency: 'usd',
      payment_method: fallbackMethod.stripePaymentMethodId,
      confirm: true,
      automatic_payment_methods: { enabled: false },
      description: `MiddleMan Bill ${input.billId} (Fallback)`,
      metadata: {
        billId: input.billId,
        userId: input.userId,
        paymentMethodId: fallbackMethod.id,
        isFallback: 'true',
      },
      statement_descriptor: 'MIDDLEMAN BILL',
    },
    { idempotencyKey: `bill-${input.billId}-fallback-${fallbackMethod.id}` },
  );

  // Record the fallback attempt
  await db.insert(schema.dunningAttempts).values({
    billId: input.billId,
    paymentMethodId: fallbackMethod.id,
    attemptNo: 4, // Fallback is always attempt 4
    method: 'fallback',
    stripePaymentIntentId: paymentIntent.id,
    amountCents: input.amountCents,
    status: 'attempted',
    attemptedAt: new Date(),
  });

  return paymentIntent.id;
}

/**
 * Escalate bill to ops for manual review.
 * Sends Slack notification to ops team with bill details and action links.
 * Updates bill status to uncollectible.
 */
export async function escalateToOps(billId: string): Promise<void> {
  const db = getDb();

  // Fetch bill + user details
  const [bill] = await db
    .select()
    .from(schema.bills)
    .where(eq(schema.bills.id, billId))
    .limit(1);

  if (!bill) throw new Error(`Bill ${billId} not found`);

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, bill.userId))
    .limit(1);

  // Get dunning attempt count
  const attempts = await db
    .select()
    .from(schema.dunningAttempts)
    .where(eq(schema.dunningAttempts.billId, billId));

  // Calculate days overdue
  const daysOverdue = Math.floor(
    (Date.now() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Update bill status
  await db
    .update(schema.bills)
    .set({ status: 'uncollectible' })
    .where(eq(schema.bills.id, billId));

  // Send Slack notification
  const slackMessage = {
    text: ':warning: Customer Delinquency Escalation',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Company:* ${user?.companyName || 'Unknown'}\n*Bill:* $${(bill.totalCents / 100).toFixed(2)}\n*Days Overdue:* ${daysOverdue}\n*Attempts:* ${attempts.length}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `_Status: ${bill.status} | Due Date: ${bill.dueDate.toLocaleDateString()}_`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View in Admin' },
            url: `${process.env.ADMIN_URL || 'http://localhost:3001'}/delinquencies/${billId}`,
            action_id: 'view_bill',
          },
        ],
      },
    ],
  };

  // Post to Slack ops channel
  try {
    if (process.env.SLACK_OPS_WEBHOOK_URL) {
      await fetch(process.env.SLACK_OPS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage),
      });
    }
  } catch (err) {
    console.error(`Failed to send Slack notification for bill ${billId}:`, err);
    // Don't fail the escalation if Slack is down
  }

  // Emit event for notifications to pick up
  await inngest.send({
    name: 'bill.escalated_to_ops',
    data: { billId, daysOverdue, attemptCount: attempts.length },
  });
}

/**
 * Check if a bill should be escalated to ops.
 * Criteria: 5+ attempts OR 7+ days overdue OR 2+ late fees assessed
 */
export async function shouldEscalateToOps(billId: string): Promise<boolean> {
  const db = getDb();

  const [bill] = await db
    .select()
    .from(schema.bills)
    .where(eq(schema.bills.id, billId))
    .limit(1);

  if (!bill) return false;

  // Get attempt count
  const attempts = await db
    .select()
    .from(schema.dunningAttempts)
    .where(eq(schema.dunningAttempts.billId, billId));

  if (attempts.length >= OPS_ESCALATION_THRESHOLD_ATTEMPTS) {
    return true; // 5+ attempts
  }

  // Check days overdue
  const daysOverdue = Math.floor(
    (Date.now() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysOverdue >= OPS_ESCALATION_DAYS_OVERDUE) {
    return true; // 7+ days overdue
  }

  // Check late fee count (should only be 1, but check for edge cases)
  if (bill.lateFeeCents > LATE_FEE_CENTS) {
    return true; // Multiple late fees applied
  }

  return false;
}

/**
 * Check if a bill has been escalated (status = uncollectible).
 */
export function isEscalated(bill: Bill): boolean {
  return bill.status === 'uncollectible';
}
