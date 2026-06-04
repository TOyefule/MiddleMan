/**
 * Bill notification jobs. Listen to Phase 3 events and dispatch customer notifications
 * for adjustments, fee waivers, status changes, and escalations.
 */
import { inngest } from '../client';
import { getDb, schema, eq } from '@middleman/db';
import * as notifications from '@middleman/api/services/notifications';

/**
 * Listen to bill.adjusted event and send customer notification.
 * Notifies customer when an adjustment (charge or credit) is applied to their bill.
 */
export const billAdjustedNotification = inngest.createFunction(
  {
    id: 'bill-adjusted-notification',
    name: 'Send bill adjusted notification',
    concurrency: { limit: 50, key: 'event.data.billId' },
  },
  { event: 'bill.adjusted' },
  async ({ event, step }) => {
    const { billId, amountCents, reason } = event.data;

    await step.run('send-notification', async () => {
      const db = getDb();

      // Get bill and user
      const [bill] = await db
        .select()
        .from(schema.bills)
        .where(eq(schema.bills.id, billId))
        .limit(1);

      if (!bill) {
        console.warn(`[Notifications] Bill ${billId} not found`);
        return;
      }

      // Determine if charge or credit
      const isCharge = amountCents > 0;
      const template = isCharge ? 'bill_adjusted_charge' : 'bill_adjusted_credit';
      const amount = Math.abs(amountCents);
      const amountFormatted = `$${(amount / 100).toFixed(2)}`;
      const newTotal = `$${(bill.totalCents / 100).toFixed(2)}`;

      // Dispatch notification
      await notifications.dispatch({
        userId: bill.userId,
        template,
        data: {
          adjustmentAmount: amountFormatted,
          creditAmount: amountFormatted,
          reason,
          newTotal,
        },
      });

      console.log(
        `[Notifications] Sent ${template} for bill ${billId}: ${amountFormatted} (${reason})`,
      );
    });
  },
);

/**
 * Listen to bill.fee_waived event and send customer notification.
 * Celebrates fee waiver and informs customer of new bill total.
 */
export const billFeeWaivedNotification = inngest.createFunction(
  {
    id: 'bill-fee-waived-notification',
    name: 'Send fee waived notification',
    concurrency: { limit: 50, key: 'event.data.billId' },
  },
  { event: 'bill.fee_waived' },
  async ({ event, step }) => {
    const { billId, waiverAmount, reason } = event.data;

    await step.run('send-notification', async () => {
      const db = getDb();

      // Get bill and user
      const [bill] = await db
        .select()
        .from(schema.bills)
        .where(eq(schema.bills.id, billId))
        .limit(1);

      if (!bill) {
        console.warn(`[Notifications] Bill ${billId} not found`);
        return;
      }

      const waiverFormatted = `$${(waiverAmount / 100).toFixed(2)}`;
      const newTotal = `$${(bill.totalCents / 100).toFixed(2)}`;

      // Dispatch notification
      await notifications.dispatch({
        userId: bill.userId,
        template: 'fee_waived',
        data: {
          waiverAmount: waiverFormatted,
          reason,
          newTotal,
        },
      });

      console.log(`[Notifications] Sent fee_waived for bill ${billId}: ${waiverFormatted}`);
    });
  },
);

/**
 * Listen to bill.marked_past_due event and send customer notification.
 * Alerts customer that their bill is past due and action is needed.
 */
export const billMarkedPastDueNotification = inngest.createFunction(
  {
    id: 'bill-marked-past-due-notification',
    name: 'Send bill marked past due notification',
    concurrency: { limit: 50, key: 'event.data.billId' },
  },
  { event: 'bill.marked_past_due' },
  async ({ event, step }) => {
    const { billId, reason } = event.data;

    await step.run('send-notification', async () => {
      const db = getDb();

      // Get bill and user
      const [bill] = await db
        .select()
        .from(schema.bills)
        .where(eq(schema.bills.id, billId))
        .limit(1);

      if (!bill) {
        console.warn(`[Notifications] Bill ${billId} not found`);
        return;
      }

      // Calculate days overdue
      const daysOverdue = Math.floor((Date.now() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalFormatted = `$${(bill.totalCents / 100).toFixed(2)}`;

      // Dispatch notification
      await notifications.dispatch({
        userId: bill.userId,
        template: 'bill_marked_past_due',
        data: {
          daysOverdue: Math.max(0, daysOverdue),
          totalAmount: totalFormatted,
          reason,
        },
      });

      console.log(
        `[Notifications] Sent bill_marked_past_due for bill ${billId}: ${daysOverdue} days overdue`,
      );
    });
  },
);

/**
 * Listen to bill.uncollectible_cleared event and send customer notification.
 * Informs customer that we're retrying payment collection and they should verify
 * their payment method is up-to-date.
 */
export const billUncollectibleClearedNotification = inngest.createFunction(
  {
    id: 'bill-uncollectible-cleared-notification',
    name: 'Send uncollectible cleared notification',
    concurrency: { limit: 50, key: 'event.data.billId' },
  },
  { event: 'bill.uncollectible_cleared' },
  async ({ event, step }) => {
    const { billId, reason } = event.data;

    await step.run('send-notification', async () => {
      const db = getDb();

      // Get bill and user
      const [bill] = await db
        .select()
        .from(schema.bills)
        .where(eq(schema.bills.id, billId))
        .limit(1);

      if (!bill) {
        console.warn(`[Notifications] Bill ${billId} not found`);
        return;
      }

      const totalFormatted = `$${(bill.totalCents / 100).toFixed(2)}`;

      // Dispatch notification
      await notifications.dispatch({
        userId: bill.userId,
        template: 'uncollectible_cleared',
        data: {
          totalAmount: totalFormatted,
          reason,
        },
      });

      console.log(`[Notifications] Sent uncollectible_cleared for bill ${billId}`);
    });
  },
);
