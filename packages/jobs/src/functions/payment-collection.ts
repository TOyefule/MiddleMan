import { inngest } from '../client';
import { getDb, schema, eq, and } from '@middleman/db';
import * as paymentCollection from '@middleman/api/services/payment-collection';

/**
 * Triggered by bill.issued event.
 * Creates a Stripe PaymentIntent for ACH debit immediately.
 * Waits for webhook confirmation with a 30-second timeout.
 */
export const paymentCollectionJob = inngest.createFunction(
  {
    id: 'payment-collection-job',
    name: 'Initiate payment collection',
    concurrency: { limit: 100, key: 'event.data.billId' },
  },
  { event: 'bill.issued' },
  async ({ event, step }) => {
    const { billId, userId, totalCents } = event.data;

    // Step 1: Create PaymentIntent
    const { paymentIntentId, paymentMethodId } = await step.run(
      'create-payment-intent',
      async () => {
        try {
          return await paymentCollection.createPaymentIntent({
            billId,
            userId,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          // If no payment method, emit bill.payment.failed immediately
          await inngest.send({
            name: 'bill.payment.failed',
            data: {
              billId,
              attemptNo: 1,
              failureCode: 'no_payment_method',
            },
          });
          throw err;
        }
      },
    );

    // Step 2: Record the payment attempt
    await step.run('record-attempt', () =>
      paymentCollection.recordPaymentAttempt({
        billId,
        paymentIntentId,
        paymentMethodId,
        amountCents: totalCents,
        attemptNo: 1,
      }),
    );

    // Step 3: Update bill status to pending_collection
    await step.run('update-bill-status', () =>
      getDb()
        .update(schema.bills)
        .set({ status: 'pending_collection' })
        .where(eq(schema.bills.id, billId)),
    );

    // Step 4: Wait for webhook confirmation with timeout
    // In practice, Stripe webhooks arrive within seconds.
    // We use a 30-second timeout; if it expires, dunning will retry.
    const webhookConfirmed = await step.waitForEvent('payment-webhook-confirmation', {
      event: ['payment_intent.succeeded', 'payment_intent.payment_failed'],
      timeout: '30s',
      match: `data.billId == "${billId}"`,
    });

    if (!webhookConfirmed) {
      // Webhook didn't arrive in time. Log and let dunning handle retry.
      console.warn(`Payment webhook timeout for bill ${billId}. Dunning will retry.`);
      return { paymentIntentId, timeout: true };
    }

    return { paymentIntentId, timeout: false };
  },
);

/**
 * Manual payment retry job.
 * Triggered by tRPC bills.retry mutation or dunning state machine escalation.
 * Creates a new PaymentIntent with optional payment method override.
 */
export const paymentRetryJob = inngest.createFunction(
  {
    id: 'payment-retry-job',
    name: 'Retry failed payment',
    concurrency: { limit: 50, key: 'event.data.billId' },
  },
  { event: 'bill.retry.requested' },
  async ({ event, step }) => {
    const { billId, userId, paymentMethodId: overrideMethodId } = event.data;

    // Validate bill exists and is not already paid
    const [bill] = await step.run('fetch-bill', () =>
      getDb()
        .select()
        .from(schema.bills)
        .where(and(eq(schema.bills.id, billId), eq(schema.bills.userId, userId)))
        .limit(1),
    );

    if (!bill) throw new Error(`Bill ${billId} not found`);
    if (bill.status === 'paid') throw new Error(`Bill ${billId} is already paid`);

    // Get attempt count
    const [lastAttempt] = await step.run('get-last-attempt', () =>
      getDb()
        .select()
        .from(schema.dunningAttempts)
        .where(eq(schema.dunningAttempts.billId, billId))
        .orderBy(
          (t) => [
            // Get attempts sorted by attemptNo descending, take the first
            { column: t.attemptNo, direction: 'desc' },
          ],
        )
        .limit(1),
    );

    const nextAttemptNo = (lastAttempt?.attemptNo ?? 0) + 1;
    if (nextAttemptNo > 5) {
      // Hard stop after 5 attempts; dunning will escalate to ops
      throw new Error(`Max retry attempts (5) exceeded for bill ${billId}`);
    }

    // Create new PaymentIntent (with optional method override)
    const { paymentIntentId, paymentMethodId } = await step.run(
      'create-retry-intent',
      () =>
        paymentCollection.createPaymentIntent({
          billId,
          userId,
          paymentMethodId: overrideMethodId,
        }),
    );

    // Record the retry attempt
    await step.run('record-retry-attempt', () =>
      paymentCollection.recordPaymentAttempt({
        billId,
        paymentIntentId,
        paymentMethodId,
        amountCents: bill.totalCents,
        attemptNo: nextAttemptNo,
      }),
    );

    // Wait for webhook confirmation
    const webhookConfirmed = await step.waitForEvent('payment-webhook-confirmation', {
      event: ['payment_intent.succeeded', 'payment_intent.payment_failed'],
      timeout: '30s',
      match: `data.billId == "${billId}"`,
    });

    return {
      billId,
      attemptNo: nextAttemptNo,
      paymentIntentId,
      webhookConfirmed: !!webhookConfirmed,
    };
  },
);
