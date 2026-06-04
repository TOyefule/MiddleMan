import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { schema, eq, and, desc } from '@middleman/db';
import { inngest } from '@middleman/jobs';
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

  getCard: protectedProcedure
    .input(z.object({ subscriptionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [card] = await ctx.db
        .select()
        .from(schema.virtualCards)
        .where(
          and(
            eq(schema.virtualCards.subscriptionId, input.subscriptionId),
            eq(schema.virtualCards.userId, ctx.user.id),
          ),
        )
        .limit(1);

      return card ?? null;
    }),

  issueCard: protectedProcedure
    .input(z.object({ subscriptionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify subscription exists and belongs to user
      const [sub] = await ctx.db
        .select()
        .from(schema.subscriptions)
        .where(
          and(
            eq(schema.subscriptions.id, input.subscriptionId),
            eq(schema.subscriptions.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!sub) throw new Error('Subscription not found');
      if (sub.providerId === null) throw new Error('Subscription must be linked to a provider');
      if (sub.expectedAmountCents === null) {
        throw new Error('Subscription amount must be set');
      }

      // Calculate cap: subscription amount + 10% buffer
      const perCycleCapCents = Math.round(sub.expectedAmountCents * 1.1);

      // Create virtual card
      const card = await issuingService.createSubscriptionCard({
        userId: ctx.user.id,
        subscriptionId: input.subscriptionId,
        perCycleCapCents,
      });

      // Emit card.issued event for downstream processing
      // (will trigger first-charge validation in Phase 4)
      await inngest.send({
        name: 'card.issued',
        data: {
          userId: ctx.user.id,
          subscriptionId: input.subscriptionId,
          virtualCardId: card.id,
        },
      });

      return card;
    }),
});
