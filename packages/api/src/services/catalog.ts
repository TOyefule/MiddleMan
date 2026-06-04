import { getDb, schema, eq, sql } from '@middleman/db';
import type { Provider, ProviderPlan } from '@middleman/db/types';

export type CatalogMatch = { provider: Provider; plan?: ProviderPlan };

/**
 * Match a raw merchant string ("NFLX.COM 866-579-7172", "Spotify P12345") to a
 * canonical provider + plan. V1: fuzzy lowercase substring + pattern array match.
 * Misses get queued by the caller into the unknown-merchants ops queue.
 */
export async function findMatch(rawMerchantName: string): Promise<CatalogMatch | null> {
  const db = getDb();
  const normalized = rawMerchantName.toLowerCase().trim();

  const [provider] = await db
    .select()
    .from(schema.providers)
    .where(
      sql`exists (
        select 1 from unnest(coalesce(${schema.providers.merchantStringPatterns}, array[]::text[])) p
        where ${sql.raw(`'${normalized.replace(/'/g, "''")}'`)} like '%' || lower(p) || '%'
      )`,
    )
    .limit(1);

  if (!provider) return null;

  const [plan] = await db
    .select()
    .from(schema.providerPlans)
    .where(eq(schema.providerPlans.providerId, provider.id))
    .limit(1);

  return { provider, plan };
}
