import { router, adminProcedure } from '../../trpc';
import { schema, sql, eq, and } from '@middleman/db';
import { z } from 'zod';

export const unknownMerchantsRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.subscriptions)
      .where(sql`${schema.subscriptions.providerId} is null`)
      .limit(200);
  }),

  linkToProvider: adminProcedure
    .input(
      z.object({
        subscriptionId: z.string().uuid(),
        providerId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get current subscription before update
      const [before] = await ctx.db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.id, input.subscriptionId))
        .limit(1);

      if (!before) {
        throw new Error('Subscription not found');
      }

      if (before.providerId) {
        throw new Error('Subscription already has a provider');
      }

      // Verify provider exists
      const [provider] = await ctx.db
        .select()
        .from(schema.providers)
        .where(eq(schema.providers.id, input.providerId))
        .limit(1);

      if (!provider) {
        throw new Error('Provider not found');
      }

      // Update subscription
      const [updated] = await ctx.db
        .update(schema.subscriptions)
        .set({
          providerId: input.providerId,
          updatedAt: new Date(),
        })
        .where(eq(schema.subscriptions.id, input.subscriptionId))
        .returning();

      // Audit log entry
      await ctx.db.insert(schema.auditLog).values({
        actorAdminId: ctx.adminId,
        actorType: 'admin',
        action: 'link_subscription_to_provider',
        targetType: 'subscription',
        targetId: input.subscriptionId,
        diff: {
          before: { providerId: before.providerId },
          after: { providerId: input.providerId, providerName: provider.displayName },
        },
      });

      return updated;
    }),

  createProvider: adminProcedure
    .input(
      z.object({
        displayName: z.string().min(1),
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
        merchantStringPatterns: z.string().array().min(1),
        cancelUrl: z.string().url(),
        homepageUrl: z.string().url(),
        linkToSubscriptionId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if provider with this slug already exists
      const [existing] = await ctx.db
        .select()
        .from(schema.providers)
        .where(eq(schema.providers.slug, input.slug))
        .limit(1);

      if (existing) {
        throw new Error(`Provider with slug "${input.slug}" already exists`);
      }

      // Create provider
      const [provider] = await ctx.db
        .insert(schema.providers)
        .values({
          slug: input.slug,
          displayName: input.displayName,
          logoUrl: `https://logo.clearbit.com/${input.homepageUrl.replace('https://', '').split('/')[0]}`,
          homepageUrl: input.homepageUrl,
          cancelUrl: input.cancelUrl,
          cardAbuseRisk: 'unknown',
          merchantStringPatterns: input.merchantStringPatterns,
          cancelPlaybookMd: `## Canceling ${input.displayName}\n\n[Ops team: Add cancellation steps here]`,
        })
        .returning();

      // Audit log for provider creation
      await ctx.db.insert(schema.auditLog).values({
        actorAdminId: ctx.adminId,
        actorType: 'admin',
        action: 'create_provider',
        targetType: 'provider',
        targetId: provider.id,
        diff: {
          displayName: input.displayName,
          slug: input.slug,
          patterns: input.merchantStringPatterns,
        },
      });

      // If linking to subscription, do that too
      if (input.linkToSubscriptionId) {
        const [subscription] = await ctx.db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.id, input.linkToSubscriptionId))
          .limit(1);

        if (!subscription) {
          throw new Error('Subscription not found');
        }

        if (subscription.providerId) {
          throw new Error('Subscription already has a provider');
        }

        // Update subscription
        await ctx.db
          .update(schema.subscriptions)
          .set({
            providerId: provider.id,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.id, input.linkToSubscriptionId));

        // Audit log for subscription link
        await ctx.db.insert(schema.auditLog).values({
          actorAdminId: ctx.adminId,
          actorType: 'admin',
          action: 'link_subscription_to_provider',
          targetType: 'subscription',
          targetId: input.linkToSubscriptionId,
          diff: {
            providerId: provider.id,
            providerName: input.displayName,
          },
        });
      }

      return provider;
    }),
});
