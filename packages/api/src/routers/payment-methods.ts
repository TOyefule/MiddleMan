import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { schema, eq, and } from '@middleman/db';

export const paymentMethodsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.paymentMethods)
      .where(eq(schema.paymentMethods.userId, ctx.user.id));
  }),

  setPrimary: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(schema.paymentMethods)
          .set({ isPrimary: false })
          .where(eq(schema.paymentMethods.userId, ctx.user.id));
        await tx
          .update(schema.paymentMethods)
          .set({ isPrimary: true })
          .where(
            and(
              eq(schema.paymentMethods.id, input.id),
              eq(schema.paymentMethods.userId, ctx.user.id),
            ),
          );
      });
      return { ok: true };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.paymentMethods)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(schema.paymentMethods.id, input.id),
            eq(schema.paymentMethods.userId, ctx.user.id),
          ),
        );
      return { ok: true };
    }),
});
