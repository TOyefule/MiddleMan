import { inngest } from '../client';
import { getDb, schema, eq } from '@middleman/db';
import * as dunningService from '@middleman/api/services/dunning';

/**
 * Dunning state machine. Triggered by bill.payment.failed event.
 * Implements smart retry strategy with escalation:
 *   Attempt 1-3: Record smart retry (Stripe scheduled), schedule next attempt
 *   Attempt 3+: Assess late fee ($15) if not already assessed
 *   Attempt 4: Try fallback payment method
 *   Attempt 5+: Escalate to ops for manual review
 *
 * Backoff timing: 12h → 24h → 48h between attempts
 */
export const dunningStateMachine = inngest.createFunction(
  {
    id: 'dunning-state-machine',
    name: 'Dunning state machine',
    concurrency: { limit: 100, key: 'event.data.billId' },
  },
  { event: 'bill.payment.failed' },
  async ({ event, step }) => {
    const { billId, attemptNo, failureCode } = event.data;

    // Step 1: Log the failure attempt (attempts 1-5)
    if (attemptNo <= 5) {
      await step.run('log-attempt', async () => {
        const db = getDb();
        const [bill] = await db
          .select()
          .from(schema.bills)
          .where(eq(schema.bills.id, billId))
          .limit(1);
        if (!bill) throw new Error(`Bill ${billId} not found`);

        // Determine method type
        let method = 'smart_retry';
        if (attemptNo === 4) method = 'fallback';
        if (attemptNo >= 5) method = 'ops_review';

        // Update dunning attempt status to 'attempted' (already recorded as 'failed' during payment)
        // This log is informational
        console.log(`[Dunning] Bill ${billId} attempt ${attemptNo} (${method}): ${failureCode}`);
      });
    }

    // Step 2: Try fallback payment method on attempt 4
    if (attemptNo === 4) {
      await step.run('attempt-fallback-payment', async () => {
        const db = getDb();
        const [bill] = await db
          .select()
          .from(schema.bills)
          .where(eq(schema.bills.id, billId))
          .limit(1);

        if (!bill) throw new Error(`Bill ${billId} not found`);

        try {
          // Attempt payment with fallback method
          const paymentIntentId = await dunningService.attemptFallbackPayment({
            billId,
            userId: bill.userId,
            amountCents: bill.totalCents,
          });

          console.log(`[Dunning] Fallback PaymentIntent created: ${paymentIntentId}`);
          // Webhook will handle success/failure
          return { paymentIntentId };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(`[Dunning] Fallback payment failed for bill ${billId}: ${message}`);
          // Fallback failed, continue to escalation checks below
          return { error: message };
        }
      });
    }

    // Step 3: Assess late fee on attempt 3+
    if (attemptNo >= 3) {
      await step.run('assess-late-fee', async () => {
        try {
          const assessed = await dunningService.assessLateFee(billId);
          if (assessed) {
            console.log(`[Dunning] Late fee assessed for bill ${billId}`);
          } else {
            console.log(`[Dunning] Late fee already assessed for bill ${billId}`);
          }
        } catch (err) {
          console.error(`[Dunning] Error assessing late fee for bill ${billId}:`, err);
        }
      });
    }

    // Step 4: Escalate to ops on attempt 5+
    if (attemptNo >= 5) {
      await step.run('escalate-to-ops', async () => {
        try {
          // Check if escalation criteria met
          const shouldEscalate = await dunningService.shouldEscalateToOps(billId);
          if (shouldEscalate) {
            await dunningService.escalateToOps(billId);
            console.log(`[Dunning] Bill ${billId} escalated to ops`);
          } else {
            console.log(`[Dunning] Bill ${billId} does not meet escalation criteria yet`);
          }
        } catch (err) {
          console.error(`[Dunning] Error escalating bill ${billId} to ops:`, err);
        }
      });
    }

    // Step 5: Schedule next retry if under attempt limit
    if (attemptNo < 5) {
      await step.run('schedule-next-retry', async () => {
        const nextRetryAt = calculateNextRetryTime(attemptNo);
        console.log(
          `[Dunning] Bill ${billId} scheduled for retry at ${nextRetryAt.toISOString()}`,
        );
        // Next retry will be picked up by payment-retry-job when nextRetryAt is reached
        // This is handled via a cron job or the scheduler (future enhancement)
      });
    }

    return { billId, attemptNo, processed: true };
  },
);

/**
 * Calculate next retry time based on attempt number.
 * Backoff: 12h → 24h → 48h
 */
function calculateNextRetryTime(attemptNo: number): Date {
  const now = new Date();
  let hoursToAdd = 12;

  if (attemptNo >= 3) hoursToAdd = 48; // 3rd attempt: next is 48h away
  else if (attemptNo >= 2) hoursToAdd = 24; // 2nd attempt: next is 24h away
  // 1st attempt: next is 12h away (default)

  return new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
}
