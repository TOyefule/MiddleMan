import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { schema, eq, and, desc } from '@middleman/db';

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
    // Live preview of the current cycle's bill (not yet finalized).
    // Implementation will sum unbilled charges + compute SaaS tier.
    return {
      userId: ctx.user.id,
      message: 'Preview endpoint — wire to billing.previewCurrentCycle in M4',
    };
  }),
});
