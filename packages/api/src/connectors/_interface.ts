import type { SubscriptionCandidate } from '../services/subscriptions';

/**
 * Provider direct-integration interface. V1 ships zero connectors — this seam
 * exists so future modules (Netflix, Spotify, etc.) can plug in uniformly.
 */
export interface ProviderConnector {
  readonly slug: string;
  readonly displayName: string;
  /** Returns true if a user's connected account has this provider available. */
  supports(userId: string): Promise<boolean>;
  /** Pulls the user's current subscriptions from the provider's API. */
  listSubscriptions(userId: string): Promise<SubscriptionCandidate[]>;
}
