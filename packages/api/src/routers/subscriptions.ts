import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { schema, eq, and, desc } from '@middleman/db';
import * as subscriptionsService from '../services/subscriptions';
import * as issuingService from '../services/issuing';

const ManualSubInput = z.object({
  rawMerchantName: z.string().min(1).max(100),
  expectedAmountCents: z.number().int().positive(),
  billingPeriod: z.enum(['monthly', 'yearly', 'weekly']).default('monthly'),
  nextExpectedAt: z.date().optional(),
});

export const subscriptionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, ctx.user.id))
      .orderBy(desc(schema.subscriptions.createdAt));
  }),

  addManual: protectedProcedure.input(ManualSubInput).mutation(async ({ ctx, input }) => {
    return subscriptionsService.addManual({
      userId: ctx.user.id,
      ...input,
    });
  }),

  pause: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await issuingService.pauseSubscriptionCard({
        userId: ctx.user.id,
        subscriptionId: input.id,
      });
      const [updated] = await ctx.db
        .update(schema.subscriptions)
        .set({ status: 'paused', pausedAt: new Date() })
        .where(
          and(
            eq(schema.subscriptions.id, input.id),
            eq(schema.subscriptions.userId, ctx.user.id),
          ),
        )
        .returning();
      return updated;
    }),

  resume: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await issuingService.resumeSubscriptionCard({
        userId: ctx.user.id,
        subscriptionId: input.id,
      });
      const [updated] = await ctx.db
        .update(schema.subscriptions)
        .set({ status: 'active', pausedAt: null })
        .where(
          and(
            eq(schema.subscriptions.id, input.id),
            eq(schema.subscriptions.userId, ctx.user.id),
          ),
        )
        .returning();
      return updated;
    }),
});
