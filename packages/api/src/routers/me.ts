import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { schema, eq } from '@middleman/db';

export const meRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      phone: ctx.user.phone,
      status: ctx.user.status,
      saasTier: ctx.user.saasTier,
      billingDay: ctx.user.billingDay,
      trialEndsAt: ctx.user.trialEndsAt,
    };
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        phone: z.string().min(10).max(20).optional(),
        billingDay: z.number().int().min(1).max(28).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(schema.users)
        .set(input)
        .where(eq(schema.users.id, ctx.user.id))
        .returning();
      return updated;
    }),
});
