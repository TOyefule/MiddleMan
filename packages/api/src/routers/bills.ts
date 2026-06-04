import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { schema, eq, and, desc } from '@middleman/db';
import { inngest } from '@middleman/jobs';
import * as billPreview from '../services/bill-preview';

export const billsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.bills)
      .where(eq(schema.bills.userId, ctx.user.id))
      .orderBy(desc(schema.bills.periodStart));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [bill] = await ctx.db
        .select()
        .from(schema.bills)
        .where(and(eq(schema.bills.id, input.id), eq(schema.bills.userId, ctx.user.id)))
        .limit(1);
      if (!bill) return null;
      const lineItems = await ctx.db
        .select()
        .from(schema.billLineItems)
        .where(eq(schema.billLineItems.billId, bill.id));
      return { ...bill, lineItems };
    }),

  preview: protectedProcedure.query(async ({ ctx }) => {
    // Live preview of the current cycle's bill (open or pending_collection).
    return billPreview.getCurrentCycleBill(ctx.user.id);
  }),

  retry: protectedProcedure
    .input(z.object({ billId: z.string().uuid(), paymentMethodId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Verify bill belongs to user
      const [bill] = await ctx.db
        .select()
        .from(schema.bills)
        .where(and(eq(schema.bills.id, input.billId), eq(schema.bills.userId, ctx.user.id)))
        .limit(1);

      if (!bill) throw new Error('Bill not found');
      if (bill.status === 'paid') throw new Error('Bill is already paid');

      // Verify payment method belongs to user (if overriding)
      if (input.paymentMethodId) {
        const [pm] = await ctx.db
          .select()
          .from(schema.paymentMethods)
          .where(
            and(
              eq(schema.paymentMethods.id, input.paymentMethodId),
              eq(schema.paymentMethods.userId, ctx.user.id),
            ),
          )
          .limit(1);
        if (!pm) throw new Error('Payment method not found');
      }

      // Emit retry event for Inngest to pick up
      await inngest.send({
        name: 'bill.retry.requested',
        data: {
          billId: input.billId,
          userId: ctx.user.id,
          paymentMethodId: input.paymentMethodId,
        },
      });

      return { ok: true };
    }),

  getPaymentStatus: protectedProcedure
    .input(z.object({ billId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Get bill + latest dunning attempts to show payment status
      const [bill] = await ctx.db
        .select()
        .from(schema.bills)
        .where(and(eq(schema.bills.id, input.billId), eq(schema.bills.userId, ctx.user.id)))
        .limit(1);

      if (!bill) return null;

      // Get all dunning attempts in reverse order (latest first)
      const attempts = await ctx.db
        .select()
        .from(schema.dunningAttempts)
        .where(eq(schema.dunningAttempts.billId, input.billId))
        .orderBy((t) => [{ column: t.attemptNo, direction: 'desc' }]);

      return {
        bill: {
          id: bill.id,
          status: bill.status,
          totalCents: bill.totalCents,
          paidAt: bill.paidAt,
          dueDate: bill.dueDate,
        },
        attempts: attempts.map((a) => ({
          attemptNo: a.attemptNo,
          status: a.status,
          failureCode: a.failureCode,
          failureMessage: a.failureMessage,
          nextRetryAt: a.nextRetryAt,
          attemptedAt: a.attemptedAt,
        })),
      };
    }),
});
