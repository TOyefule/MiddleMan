import { inngest } from '../client';
import * as billing from '@middleman/api/services/billing';
import { getDb, schema, eq } from '@middleman/db';

/**
 * Cron job — runs hourly and closes any user whose billing_day matches today AND
 * who hasn't already been closed for the current period.
 *
 * Why hourly: lets us spread cycle-close load across the day and absorb retries
 * without overlap. The actual close is idempotent on (user_id, period_start).
 */
export const cycleCloseScheduler = inngest.createFunction(
  { id: 'cycle-close-scheduler', name: 'Cycle-close scheduler' },
  { cron: '0 * * * *' },
  async ({ step }) => {
    const today = new Date();
    const day = today.getUTCDate();

    const usersDueToday = await step.run('find-users-due-today', async () => {
      const db = getDb();
      return db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.billingDay, day));
    });

    await step.run('fan-out-cycle-close', async () => {
      for (const u of usersDueToday) {
        await inngest.send({
          name: 'cycle.close.requested',
          data: {
            userId: u.id,
            periodStart: monthStart(today).toISOString(),
            periodEnd: monthEnd(today).toISOString(),
            dueDate: addBusinessDays(today, 3).toISOString(),
          },
        });
      }
    });

    return { closed: usersDueToday.length };
  },
);

export const cycleCloseWorker = inngest.createFunction(
  {
    id: 'cycle-close-worker',
    name: 'Close one user cycle',
    concurrency: { limit: 50, key: 'event.data.userId' },
  },
  { event: 'cycle.close.requested' },
  async ({ event, step }) => {
    const bill = await step.run('close-cycle', () =>
      billing.closeCycle({
        userId: event.data.userId,
        periodStart: new Date(event.data.periodStart),
        periodEnd: new Date(event.data.periodEnd),
        dueDate: new Date(event.data.dueDate),
      }),
    );
    await step.sendEvent('emit-bill-issued', {
      name: 'bill.issued',
      data: { billId: bill.id, userId: bill.userId, totalCents: bill.totalCents },
    });
    return { billId: bill.id };
  },
);

function monthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function monthEnd(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}
function addBusinessDays(d: Date, n: number): Date {
  const out = new Date(d);
  let added = 0;
  while (added < n) {
    out.setUTCDate(out.getUTCDate() + 1);
    const wd = out.getUTCDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return out;
}
