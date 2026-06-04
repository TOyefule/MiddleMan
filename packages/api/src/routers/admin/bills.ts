import { z } from 'zod';
import { router, adminProcedure } from '../../trpc';
import { schema, eq } from '@middleman/db';
import * as billAdmin from '../../services/bill-admin';

export const billsRouter = router({
  /**
   * Adjust a bill by adding or subtracting a charge.
   * Positive amountCents = charge, negative = credit.
   */
  adjust: adminProcedure
    .input(
      z.object({
        billId: z.string().uuid(),
        amountCents: z.number().int(),
        reason: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify bill exists
      const [bill] = await ctx.db
        .select()
        .from(schema.bills)
        .where(eq(schema.bills.id, input.billId))
        .limit(1);

      if (!bill) throw new Error(`Bill ${input.billId} not found`);

      // Apply adjustment
      const result = await billAdmin.adjustBill({
        billId: input.billId,
        amountCents: input.amountCents,
        reason: input.reason,
        adminId: ctx.user.id,
      });

      // Log admin action
      console.log(
        `[Admin] ${ctx.user.id} adjusted bill ${input.billId} by $${(input.amountCents / 100).toFixed(2)}: ${input.reason}`,
      );

      return result;
    }),

  /**
   * Waive a late fee on a bill.
   */
  waiveFee: adminProcedure
    .input(
      z.object({
        billId: z.string().uuid(),
        reason: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify bill exists
      const [bill] = await ctx.db
        .select()
        .from(schema.bills)
        .where(eq(schema.bills.id, input.billId))
        .limit(1);

      if (!bill) throw new Error(`Bill ${input.billId} not found`);

      // Apply waiver
      const result = await billAdmin.waiveFee({
        billId: input.billId,
        reason: input.reason,
        adminId: ctx.user.id,
      });

      // Log admin action
      if (result.credited) {
        console.log(
          `[Admin] ${ctx.user.id} waived $${(result.waiverAmount / 100).toFixed(2)} late fee on bill ${input.billId}: ${input.reason}`,
        );
      }

      return result;
    }),

  /**
   * Mark a bill as past due (manual override).
   */
  markPastDue: adminProcedure
    .input(
      z.object({
        billId: z.string().uuid(),
        reason: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify bill exists
      const [bill] = await ctx.db
        .select()
        .from(schema.bills)
        .where(eq(schema.bills.id, input.billId))
        .limit(1);

      if (!bill) throw new Error(`Bill ${input.billId} not found`);

      // Apply status change
      await billAdmin.markPastDue({
        billId: input.billId,
        reason: input.reason,
        adminId: ctx.user.id,
      });

      // Log admin action
      console.log(`[Admin] ${ctx.user.id} marked bill ${input.billId} as past due: ${input.reason}`);

      return { success: true };
    }),

  /**
   * Clear uncollectible status and return bill to pending collection.
   */
  clearUncollectible: adminProcedure
    .input(
      z.object({
        billId: z.string().uuid(),
        reason: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify bill exists
      const [bill] = await ctx.db
        .select()
        .from(schema.bills)
        .where(eq(schema.bills.id, input.billId))
        .limit(1);

      if (!bill) throw new Error(`Bill ${input.billId} not found`);

      // Apply status change
      await billAdmin.clearUncollectible({
        billId: input.billId,
        reason: input.reason,
        adminId: ctx.user.id,
      });

      // Log admin action
      console.log(
        `[Admin] ${ctx.user.id} cleared uncollectible status on bill ${input.billId}: ${input.reason}`,
      );

      return { success: true };
    }),

  /**
   * Get delinquency summary for a bill (used in admin detail view).
   */
  getDelinquencySummary: adminProcedure
    .input(z.object({ billId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return billAdmin.getDelinquencySummary(input.billId);
    }),
});
