import { z } from 'zod';
import { router, adminProcedure } from '../../trpc';
import { schema, eq, desc, inArray, and } from '@middleman/db';
import * as billAdmin from '../../services/bill-admin';
import * as billPreview from '../../services/bill-preview';

export const delinquenciesRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    // Get all past_due and uncollectible bills with delinquency summary
    const bills = await ctx.db
      .select()
      .from(schema.bills)
      .where(inArray(schema.bills.status, ['past_due', 'uncollectible']))
      .orderBy(desc(schema.bills.dueDate))
      .limit(200);

    // For each bill, get the user and attempt count
    const enriched = await Promise.all(
      bills.map(async (bill) => {
        const [user] = await ctx.db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, bill.userId))
          .limit(1);

        const attempts = await ctx.db
          .select()
          .from(schema.dunningAttempts)
          .where(eq(schema.dunningAttempts.billId, bill.id));

        const daysOverdue = Math.floor(
          (Date.now() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
          billId: bill.id,
          userId: bill.userId,
          companyName: user?.companyName || 'Unknown',
          totalCents: bill.totalCents,
          paidCents: bill.paidCents,
          remainingCents: Math.max(0, bill.totalCents - bill.paidCents),
          lateFeeCents: bill.lateFeeCents,
          status: bill.status,
          dueDate: bill.dueDate,
          daysOverdue,
          attemptCount: attempts.length,
          lastAttemptAt: attempts.length > 0 ? attempts[attempts.length - 1].attemptedAt : null,
          failureCode: attempts.length > 0 ? attempts[attempts.length - 1].failureCode : null,
        };
      }),
    );

    return enriched;
  }),

  get: adminProcedure
    .input(z.object({ billId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Get full delinquency detail with bill info, user, and dunning history
      const [bill] = await ctx.db
        .select()
        .from(schema.bills)
        .where(eq(schema.bills.id, input.billId))
        .limit(1);

      if (!bill) return null;

      // Get user
      const [user] = await ctx.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, bill.userId))
        .limit(1);

      // Get bill preview (includes line items and payment methods)
      const preview = await billPreview.getBillDetail(input.billId, bill.userId);

      // Get dunning attempts
      const attempts = await ctx.db
        .select()
        .from(schema.dunningAttempts)
        .where(eq(schema.dunningAttempts.billId, input.billId))
        .orderBy((a) => [{ column: a.attemptNo, direction: 'desc' }]);

      const daysOverdue = Math.floor(
        (Date.now() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        bill: {
          id: bill.id,
          status: bill.status,
          periodStart: bill.periodStart,
          periodEnd: bill.periodEnd,
          dueDate: bill.dueDate,
          daysOverdue,
          totalCents: bill.totalCents,
          paidCents: bill.paidCents,
          remainingCents: Math.max(0, bill.totalCents - bill.paidCents),
          lateFeeCents: bill.lateFeeCents,
        },
        user: {
          id: user?.id || 'unknown',
          companyName: user?.companyName || 'Unknown',
          email: user?.email || 'unknown',
        },
        preview,
        dunningHistory: attempts.map((a) => ({
          attemptNo: a.attemptNo,
          method: a.method,
          status: a.status,
          failureCode: a.failureCode,
          failureMessage: a.failureMessage,
          attemptedAt: a.attemptedAt,
          nextRetryAt: a.nextRetryAt,
        })),
      };
    }),
});

