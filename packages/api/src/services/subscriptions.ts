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

export function mapFrequencyToPeriod(
  freq: string,
): 'monthly' | 'yearly' | 'weekly' {
  const normalized = freq.toUpperCase();
  if (normalized === 'ANNUAL' || normalized === 'YEARLY') return 'yearly';
  if (normalized === 'WEEKLY') return 'weekly';
  return 'monthly';
}

export function addFrequencyToDate(date: Date, freq: string): Date {
  const nextDate = new Date(date);
  const normalized = freq.toUpperCase();

  if (normalized === 'WEEKLY') {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (normalized === 'SEMI_MONTHLY') {
    nextDate.setDate(nextDate.getDate() + 15);
  } else if (normalized === 'ANNUAL' || normalized === 'YEARLY') {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  } else {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }

  return nextDate;
}
