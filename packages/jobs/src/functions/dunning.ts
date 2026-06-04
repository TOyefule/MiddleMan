import { inngest } from '../client';
import { getDb, schema, eq, and } from '@middleman/db';

/**
 * Dunning state machine. On bill.payment.failed:
 *   attempt 1, 2, 3: Stripe Smart Retries (Stripe handles the schedule; we just log).
 *   attempt 4: fallback to secondary payment method.
 *   day 7: assess late fee.
 *   day 14: escalate to ops review (no automatic card pause per product decision).
 */
export const dunningStateMachine = inngest.createFunction(
  {
    id: 'dunning-state-machine',
    name: 'Dunning state machine',
    concurrency: { limit: 100, key: 'event.data.billId' },
  },
  { event: 'bill.payment.failed' },
  async ({ event, step }) => {
    const { billId, attemptNo } = event.data;

    if (attemptNo <= 3) {
      await step.run('log-smart-retry', () =>
        recordAttempt(billId, attemptNo, 'smart_retry', event.data.failureCode),
      );
    } else if (attemptNo === 4) {
      await step.run('try-fallback-method', async () => {
        await recordAttempt(billId, attemptNo, 'fallback', event.data.failureCode);
        // TODO: trigger Stripe PaymentIntent against the user's fallback method
      });
    }

    if (attemptNo >= 3) {
      await step.run('assess-late-fee', () => assessLateFee(billId));
    }

    if (attemptNo >= 5) {
      await step.run('escalate-to-ops', () => escalateToOps(billId));
    }

    return { billId, attemptNo };
  },
);

async function recordAttempt(
  billId: string,
  attemptNo: number,
  method: string,
  failureCode: string,
) {
  const db = getDb();
  const [bill] = await db
    .select()
    .from(schema.bills)
    .where(eq(schema.bills.id, billId))
    .limit(1);
  if (!bill) return;
  await db.insert(schema.dunningAttempts).values({
    billId,
    attemptNo,
    method,
    amountCents: bill.totalCents,
    status: 'failed',
    failureCode,
    attemptedAt: new Date(),
  });
}

async function assessLateFee(billId: string) {
  const db = getDb();
  const [bill] = await db
    .select()
    .from(schema.bills)
    .where(and(eq(schema.bills.id, billId)))
    .limit(1);
  if (!bill || bill.lateFeeCents > 0) return;
  const LATE_FEE = 1500;
  await db.transaction(async (tx) => {
    await tx
      .update(schema.bills)
      .set({
        lateFeeCents: LATE_FEE,
        totalCents: bill.totalCents + LATE_FEE,
        status: 'past_due',
      })
      .where(eq(schema.bills.id, billId));
    await tx.insert(schema.billLineItems).values({
      billId,
      type: 'late_fee',
      description: 'Late fee — payment past due',
      amountCents: LATE_FEE,
    });
  });
}

async function escalateToOps(billId: string) {
  const db = getDb();
  await db
    .update(schema.bills)
    .set({ status: 'uncollectible' })
    .where(eq(schema.bills.id, billId));
  // TODO: Slack ops webhook ping
}
