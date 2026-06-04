import { getDb, schema } from '@middleman/db';
import * as catalog from './catalog';

export type AddManualInput = {
  userId: string;
  rawMerchantName: string;
  expectedAmountCents: number;
  billingPeriod: 'monthly' | 'yearly' | 'weekly';
  nextExpectedAt?: Date;
};

export async function addManual(input: AddManualInput) {
  const db = getDb();
  const match = await catalog.findMatch(input.rawMerchantName);
  const [sub] = await db
    .insert(schema.subscriptions)
    .values({
      userId: input.userId,
      providerId: match?.provider.id ?? null,
      providerPlanId: match?.plan?.id ?? null,
      rawMerchantName: input.rawMerchantName,
      source: 'manual',
      status: 'tracking_only',
      expectedAmountCents: input.expectedAmountCents,
      billingPeriod: input.billingPeriod,
      nextExpectedAt: input.nextExpectedAt,
    })
    .returning();
  return sub;
}

/**
 * Unified candidate shape produced by every discovery source (manual / plaid / direct).
 * The ingestion router accepts these and dedupes against existing subscriptions.
 */
export type SubscriptionCandidate = {
  source: 'manual' | 'plaid' | 'direct';
  rawMerchantName: string;
  expectedAmountCents: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly' | 'weekly';
  nextExpectedAt?: Date;
  externalRef?: { plaidStreamId?: string; directProvider?: string };
};
