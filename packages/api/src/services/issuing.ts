import { getDb, schema, eq, and } from '@middleman/db';
import { getStripe } from '../lib/stripe';
import { getRedis } from '../lib/redis';
import { KycRequiredError, NotFoundError } from '../lib/errors';
import * as kycService from './kyc';

const CARD_CACHE_TTL_SECONDS = 300;

export type CreateCardInput = {
  userId: string;
  subscriptionId: string;
  perCycleCapCents: number;
};

/**
 * Issues a Stripe Issuing virtual card scoped to a single subscription.
 * Caller MUST have already created a Stripe cardholder for the user
 * (happens at full-KYC completion).
 */
export async function createSubscriptionCard(input: CreateCardInput) {
  const db = getDb();
  const stripe = getStripe();

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, input.userId))
    .limit(1);
  if (!user) throw new NotFoundError('User');

  const [kyc] = await db
    .select()
    .from(schema.kycProfiles)
    .where(eq(schema.kycProfiles.userId, input.userId))
    .limit(1);
  if (!kyc || kyc.status !== 'verified' || kyc.level !== 'full') {
    throw new KycRequiredError();
  }

  // Get or create Stripe cardholder for this user
  let cardholderId = kyc.stripeCardholderId;
  if (!cardholderId) {
    cardholderId = await getOrCreateCardholder(input.userId, user);
    // Update KYC profile with cardholder ID
    await db
      .update(schema.kycProfiles)
      .set({ stripeCardholderId: cardholderId })
      .where(eq(schema.kycProfiles.id, kyc.id));
  }

  const card = await stripe.issuing.cards.create({
    cardholder: cardholderId,
    currency: 'usd',
    type: 'virtual',
    status: 'active',
    spending_controls: {
      spending_limits: [
        { amount: input.perCycleCapCents, interval: 'monthly' },
      ],
    },
  });

  const [row] = await db
    .insert(schema.virtualCards)
    .values({
      userId: input.userId,
      subscriptionId: input.subscriptionId,
      stripeCardId: card.id,
      stripeCardholderId: cardholderId,
      last4: card.last4 ?? null,
      brand: card.brand ?? null,
      status: 'active',
      perCycleCapCents: input.perCycleCapCents,
      spendingCaps: card.spending_controls as unknown as Record<string, unknown>,
      cycleStartedAt: new Date(),
    })
    .returning();

  await invalidateCardCache(card.id);
  return row;
}

export async function pauseSubscriptionCard(input: {
  userId: string;
  subscriptionId: string;
}) {
  const db = getDb();
  const stripe = getStripe();
  const [card] = await db
    .select()
    .from(schema.virtualCards)
    .where(
      and(
        eq(schema.virtualCards.userId, input.userId),
        eq(schema.virtualCards.subscriptionId, input.subscriptionId),
      ),
    )
    .limit(1);
  if (!card) return null;
  await stripe.issuing.cards.update(card.stripeCardId, { status: 'inactive' });
  await db
    .update(schema.virtualCards)
    .set({ status: 'inactive' })
    .where(eq(schema.virtualCards.id, card.id));
  await invalidateCardCache(card.stripeCardId);
  return card;
}

export async function resumeSubscriptionCard(input: {
  userId: string;
  subscriptionId: string;
}) {
  const db = getDb();
  const stripe = getStripe();
  const [card] = await db
    .select()
    .from(schema.virtualCards)
    .where(
      and(
        eq(schema.virtualCards.userId, input.userId),
        eq(schema.virtualCards.subscriptionId, input.subscriptionId),
      ),
    )
    .limit(1);
  if (!card) return null;
  await stripe.issuing.cards.update(card.stripeCardId, { status: 'active' });
  await db
    .update(schema.virtualCards)
    .set({ status: 'active' })
    .where(eq(schema.virtualCards.id, card.id));
  await invalidateCardCache(card.stripeCardId);
  return card;
}

/**
 * Cached card metadata for the Edge auth-webhook fast path.
 * One Redis read; one DB read on cache miss.
 */
export type CachedCard = {
  cardId: string;
  userId: string;
  subscriptionId: string;
  status: string;
  perCycleCapCents: number | null;
};

export async function getCachedCard(stripeCardId: string): Promise<CachedCard | null> {
  const redis = getRedis();
  const cached = await redis.get<CachedCard>(`vc:${stripeCardId}`);
  if (cached) return cached;

  // Fall through to DB (Edge runtime: use getEdgeDb here in the actual route handler)
  return null;
}

export async function primeCardCache(card: CachedCard): Promise<void> {
  const redis = getRedis();
  await redis.set(`vc:${card.cardId}`, card, { ex: CARD_CACHE_TTL_SECONDS });
}

export async function invalidateCardCache(stripeCardId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`vc:${stripeCardId}`);
}

/**
 * Create a Stripe Issuing cardholder for a user
 * Called once per user after KYC verification
 */
async function getOrCreateCardholder(
  userId: string,
  user: { id: string; email: string | null },
): Promise<string> {
  const stripe = getStripe();

  // Create cardholder with basic info
  // Note: Full PII (SSN, DOB, address) would be encrypted in KMS
  const cardholder = await stripe.issuing.cardholders.create({
    type: 'individual',
    name: user.email?.split('@')[0] || 'MiddleMan User',
    email: user.email || undefined,
    metadata: { middleman_user_id: userId },
  });

  return cardholder.id;
}
