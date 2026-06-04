import { inngest } from '../client';
import { getDb, schema, eq } from '@middleman/db';

/**
 * Handle charge authorization events from Stripe Issuing auth webhook.
 *
 * Updates virtual_cards.currentCycleSpentCents and logs all authorization events.
 * Also alerts if card is approaching spending cap (80%+).
 */
export const cardAuthHandler = inngest.createFunction(
  {
    id: 'card-auth-handler',
    name: 'Handle card authorization',
    concurrency: { limit: 100, key: 'event.data.virtualCardId' },
  },
  { event: 'charge.authorized' },
  async ({ event, step }) => {
    const { userId, subscriptionId, virtualCardId, stripeAuthorizationId, amountCents } =
      event.data;

    await step.run('log-authorization', async () => {
      const db = getDb();

      // Update virtual card's currentCycleSpentCents
      const [card] = await db
        .select()
        .from(schema.virtualCards)
        .where(eq(schema.virtualCards.id, virtualCardId))
        .limit(1);

      if (!card) {
        throw new Error(`Virtual card ${virtualCardId} not found`);
      }

      const newSpentCents = (card.currentCycleSpentCents ?? 0) + amountCents;

      await db
        .update(schema.virtualCards)
        .set({ currentCycleSpentCents: newSpentCents })
        .where(eq(schema.virtualCards.id, virtualCardId));

      // Check if approaching cap (80%+)
      if (card.perCycleCapCents && newSpentCents >= card.perCycleCapCents * 0.8) {
        const percentUsed = Math.round((newSpentCents / card.perCycleCapCents) * 100);
        console.warn(
          `[CARD_CAP_ALERT] Card ${virtualCardId} is ${percentUsed}% of cap (${newSpentCents}/${card.perCycleCapCents})`,
        );

        // TODO: Emit notification event to alert user
        // await inngest.send({
        //   name: 'notification.card.cap-warning',
        //   data: { userId, virtualCardId, percentUsed }
        // });
      }

      return {
        virtualCardId,
        stripeAuthorizationId,
        previousSpent: card.currentCycleSpentCents ?? 0,
        newSpent: newSpentCents,
        cardCap: card.perCycleCapCents,
      };
    });

    return { authorized: true };
  },
);

/**
 * Handle charge decline events.
 * Logs failure reason and alerts user.
 */
export const cardDeclineHandler = inngest.createFunction(
  {
    id: 'card-decline-handler',
    name: 'Handle card decline',
    concurrency: { limit: 100, key: 'event.data.virtualCardId' },
  },
  { event: 'charge.declined' },
  async ({ event, step }) => {
    const { userId, virtualCardId, stripeAuthorizationId, amountCents, reason } = event.data;

    await step.run('log-decline', async () => {
      console.warn(
        `[CARD_DECLINE] Card ${virtualCardId}: ${reason} (${amountCents} cents)`,
      );

      // TODO: Emit notification to alert user of failed charge
      // await inngest.send({
      //   name: 'notification.card.declined',
      //   data: { userId, virtualCardId, reason, amountCents }
      // });
    });

    return { declined: true };
  },
);
