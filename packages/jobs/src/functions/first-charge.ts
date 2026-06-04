import { inngest } from '../client';
import { getDb, schema, eq } from '@middleman/db';
import { getStripe } from '@middleman/api/lib/stripe';

/**
 * Validate newly issued card by attempting a small test charge.
 *
 * Triggered when card is issued (card.issued event).
 * Attempts a $0.01 charge to verify card is valid.
 * On success: transitions subscription to 'active'.
 * On failure: emits 'card.declined' for user notification.
 */
export const firstChargeValidator = inngest.createFunction(
  {
    id: 'first-charge-validator',
    name: 'Validate new card with test charge',
    concurrency: { limit: 50, key: 'event.data.virtualCardId' },
  },
  { event: 'card.issued' },
  async ({ event, step }) => {
    const { userId, subscriptionId, virtualCardId } = event.data;

    const cardData = await step.run('fetch-card-details', async () => {
      const db = getDb();
      const [card] = await db
        .select()
        .from(schema.virtualCards)
        .where(eq(schema.virtualCards.id, virtualCardId))
        .limit(1);

      if (!card) {
        throw new Error(`Virtual card ${virtualCardId} not found`);
      }

      const [sub] = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.id, subscriptionId))
        .limit(1);

      if (!sub) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }

      return { card, subscription: sub };
    });

    // Attempt $0.01 test charge via Stripe Test Charge API
    // Note: In production, this creates an actual charge; in test mode it's free
    const chargeResult = await step.run('attempt-test-charge', async () => {
      const stripe = getStripe();

      try {
        // Create a test authorization via Stripe Test API
        // In real usage, this would be a payment method charge
        // For now, we simulate by checking if card status transitions correctly
        const charge = await stripe.charges.create({
          amount: 1, // $0.01 in cents
          currency: 'usd',
          source: `card_${cardData.card.last4}`, // Simplified; real usage needs payment method
          description: `MiddleMan card validation for subscription ${subscriptionId}`,
          metadata: {
            middleman_card_id: virtualCardId,
            middleman_subscription_id: subscriptionId,
            purpose: 'card_validation',
          },
        });

        return { success: true, chargeId: charge.id };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { success: false, errorMessage };
      }
    });

    if (chargeResult.success) {
      // Success: transition subscription to active
      await step.run('activate-subscription', async () => {
        const db = getDb();
        const [updated] = await db
          .update(schema.subscriptions)
          .set({ status: 'active' })
          .where(eq(schema.subscriptions.id, subscriptionId))
          .returning();

        return updated;
      });

      // Mark card as active (was pending)
      await step.run('mark-card-active', async () => {
        const db = getDb();
        await db
          .update(schema.virtualCards)
          .set({ status: 'active' })
          .where(eq(schema.virtualCards.id, virtualCardId));
      });

      // Emit subscription.activated event for downstream (notifications, etc.)
      await step.run('emit-activation-event', async () => {
        await inngest.send({
          name: 'subscription.activated',
          data: { userId, subscriptionId, virtualCardId },
        });
      });

      return {
        result: 'success',
        subscription: 'activated',
        message: 'Test charge succeeded; subscription is now active',
      };
    } else {
      // Failure: emit decline event
      await step.run('emit-decline-event', async () => {
        await inngest.send({
          name: 'card.declined',
          data: {
            userId,
            virtualCardId,
            reason: chargeResult.errorMessage || 'card_validation_failed',
          },
        });
      });

      return {
        result: 'failure',
        reason: chargeResult.errorMessage || 'unknown',
        message: 'Test charge failed; user needs to retry with different card',
      };
    }
  },
);
