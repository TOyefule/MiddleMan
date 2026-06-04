import { inngest } from '../client';

/**
 * Reacts to Plaid `RECURRING_TRANSACTIONS:UPDATE` webhooks. Fetches the latest
 * recurring streams for the item, normalizes them to SubscriptionCandidate, and
 * inserts new ones for ops queue review (status = tracking_only).
 *
 * Full implementation lands in M2 — this is the wiring shell so the webhook
 * route has somewhere to send events.
 */
export const plaidRecurringSync = inngest.createFunction(
  {
    id: 'plaid-recurring-sync',
    name: 'Plaid recurring sync',
    concurrency: { limit: 20, key: 'event.data.itemId' },
  },
  { event: 'plaid.recurring.updated' },
  async ({ event, step }) => {
    await step.run('fetch-streams', async () => {
      // TODO M2: getPlaid().transactionsRecurringGet({ access_token })
      return { itemId: event.data.itemId, streamsFetched: 0 };
    });

    await step.run('upsert-candidates', async () => {
      // TODO M2: map streams to SubscriptionCandidate[], dedupe vs existing rows
      return { upserted: 0, queued: 0 };
    });

    return { itemId: event.data.itemId };
  },
);
