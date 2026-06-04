import { getDb, schema, eq, and } from '@middleman/db';
import { getPlaid } from '@middleman/api/lib/plaid';
import * as subscriptions from '@middleman/api/services/subscriptions';
import * as catalog from '@middleman/api/services/catalog';
import { inngest } from '../client';

/**
 * Reacts to Plaid `RECURRING_TRANSACTIONS:UPDATE` webhooks. Fetches the latest
 * recurring streams for the item, normalizes them to SubscriptionCandidate, and
 * inserts new ones for ops queue review (status = tracking_only).
 */
export const plaidRecurringSync = inngest.createFunction(
  {
    id: 'plaid-recurring-sync',
    name: 'Plaid recurring sync',
    concurrency: { limit: 20, key: 'event.data.itemId' },
  },
  { event: 'plaid.recurring.updated' },
  async ({ event, step }) => {
    const itemId = event.data.itemId;
    const userId = event.data.userId;

    const streams = await step.run('fetch-streams', async () => {
      const db = getDb();

      // Lookup access token from plaid_items table
      const [plaidItem] = await db
        .select({ accessToken: schema.plaidItems.accessToken })
        .from(schema.plaidItems)
        .where(eq(schema.plaidItems.itemId, itemId))
        .limit(1);

      if (!plaidItem) {
        console.error(`Plaid item not found for itemId: ${itemId}`);
        return [];
      }

      try {
        const response = await getPlaid().transactionsRecurringGet({
          access_token: plaidItem.accessToken,
        });

        return response.data.recurring_transactions || [];
      } catch (error) {
        console.error(`Failed to fetch recurring transactions for ${itemId}:`, error);
        return [];
      }
    });

    await step.run('upsert-candidates', async () => {
      if (streams.length === 0) {
        return { inserted: 0, matched: 0, queued: 0 };
      }

      const db = getDb();

      // Map Plaid streams to SubscriptionCandidate[]
      const candidates: subscriptions.SubscriptionCandidate[] = streams.map(
        (stream) => ({
          source: 'plaid' as const,
          rawMerchantName: stream.merchant_name,
          expectedAmountCents: Math.round(stream.amount * 100),
          currency: stream.currency_code || 'USD',
          billingPeriod: subscriptions.mapFrequencyToPeriod(
            stream.frequency,
          ),
          nextExpectedAt: subscriptions.addFrequencyToDate(
            new Date(stream.last_date),
            stream.frequency,
          ),
          externalRef: { plaidStreamId: stream.id },
        }),
      );

      let inserted = 0;
      let matched = 0;
      let queued = 0;

      for (const candidate of candidates) {
        // Check if subscription already exists (deduplication)
        const existing = await db
          .select({ id: schema.subscriptions.id })
          .from(schema.subscriptions)
          .where(
            and(
              eq(schema.subscriptions.userId, userId),
              eq(schema.subscriptions.rawMerchantName, candidate.rawMerchantName),
              eq(schema.subscriptions.source, 'plaid'),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          continue; // Skip duplicates
        }

        // Try to match against provider catalog
        const match = await catalog.findMatch(candidate.rawMerchantName);

        const [sub] = await db
          .insert(schema.subscriptions)
          .values({
            userId,
            providerId: match?.provider.id ?? null,
            providerPlanId: match?.plan?.id ?? null,
            rawMerchantName: candidate.rawMerchantName,
            source: 'plaid',
            status: 'tracking_only',
            expectedAmountCents: candidate.expectedAmountCents,
            currency: candidate.currency,
            billingPeriod: candidate.billingPeriod,
            nextExpectedAt: candidate.nextExpectedAt,
          })
          .returning();

        inserted++;
        if (match) {
          matched++;
        } else {
          queued++;
        }
      }

      return { inserted, matched, queued };
    });

    return { itemId, userId };
  },
);
