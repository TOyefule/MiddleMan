import type { SubscriptionCandidate } from '../services/subscriptions';
import type { ProviderConnector } from './_interface';

/**
 * Registry of provider-direct connectors (e.g., Stripe, AWS, Netflix).
 * Each connector handles OAuth/API authentication and subscription fetching
 * for a specific provider. V1 ships zero implementations; this infrastructure
 * allows future connectors to plug in uniformly.
 */
export const allConnectors: ProviderConnector[] = [
  // TODO M3/M4: Add Stripe connector
  // TODO M3/M4: Add AWS connector
  // TODO M3/M4: Add Netflix connector
];

/**
 * Discover subscriptions across all enabled provider-direct connectors.
 * For each connector the user supports, fetch and return candidates.
 */
export async function discoverAllDirectSources(
  userId: string,
): Promise<SubscriptionCandidate[]> {
  const allCandidates: SubscriptionCandidate[] = [];

  for (const connector of allConnectors) {
    try {
      const supports = await connector.supports(userId);
      if (!supports) continue;

      const candidates = await connector.listSubscriptions(userId);
      allCandidates.push(...candidates);
    } catch (error) {
      console.error(
        `Error discovering subscriptions from ${connector.displayName}:`,
        error,
      );
    }
  }

  return allCandidates;
}
