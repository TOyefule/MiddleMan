/**
 * Stripe Issuing authorization webhook — runs on Edge runtime for <2s SLA.
 *
 * Sync path: verify signature → cached card lookup → approve/decline.
 * Async path: Inngest event for ledger write + notifications.
 */
export const runtime = 'edge';

import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getEdgeDb, schema, eq, sql } from '@middleman/db';
import { Redis } from '@upstash/redis';

type CachedCard = {
  cardId: string;
  userId: string;
  subscriptionId: string;
  status: string;
  perCycleCapCents: number | null;
};

const CARD_CACHE_TTL = 300;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_ISSUING_WEBHOOK_SECRET!,
    );
  } catch (err) {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
  }

  if (event.type !== 'issuing_authorization.request') {
    return NextResponse.json({ received: true });
  }

  const authorization = event.data.object as Stripe.Issuing.Authorization;
  const stripeCardId =
    typeof authorization.card === 'string' ? authorization.card : authorization.card.id;
  const amountCents = authorization.pending_request?.amount ?? authorization.amount;

  try {
    const card = await getCardData(stripeCardId);
    if (!card || card.status !== 'active') {
      return NextResponse.json({ approved: false, reason: 'card_inactive' });
    }

    // Check per-user collective monthly cap
    const db = getEdgeDb();
    const [user] = await db
      .select({
        spent: schema.users.currentPeriodSpentCents,
        cap: schema.users.monthlyCapCents,
      })
      .from(schema.users)
      .where(eq(schema.users.id, card.userId))
      .limit(1);

    if (!user || (user.spent + amountCents) > user.cap) {
      return NextResponse.json({ approved: false, reason: 'cap_exceeded' });
    }

    // Approve — async work via Inngest
    await sendInngestEvent({
      name: 'charge.authorized',
      data: {
        userId: card.userId,
        subscriptionId: card.subscriptionId,
        virtualCardId: card.cardId,
        stripeAuthorizationId: authorization.id,
        amountCents,
        occurredAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ approved: true });
  } catch (err) {
    console.error('Issuing auth webhook error', err);
    return NextResponse.json({ approved: false, reason: 'verification_failed' });
  }
}

async function getCardData(stripeCardId: string): Promise<CachedCard | null> {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const cached = await redis.get<CachedCard>(`vc:${stripeCardId}`);
  if (cached) return cached;

  const db = getEdgeDb();
  const [row] = await db
    .select({
      cardId: schema.virtualCards.id,
      userId: schema.virtualCards.userId,
      subscriptionId: schema.virtualCards.subscriptionId,
      status: schema.virtualCards.status,
      perCycleCapCents: schema.virtualCards.perCycleCapCents,
    })
    .from(schema.virtualCards)
    .where(eq(schema.virtualCards.stripeCardId, stripeCardId))
    .limit(1);

  if (!row) return null;

  const card: CachedCard = {
    cardId: row.cardId,
    userId: row.userId,
    subscriptionId: row.subscriptionId,
    status: row.status,
    perCycleCapCents: row.perCycleCapCents,
  };

  await redis.set(`vc:${stripeCardId}`, card, { ex: CARD_CACHE_TTL });
  return card;
}

async function sendInngestEvent(event: { name: string; data: Record<string, unknown> }) {
  const key = process.env.INNGEST_EVENT_KEY;
  if (!key) {
    console.error('INNGEST_EVENT_KEY not set — skipping async event');
    return;
  }
  await fetch('https://inn.gs/e/' + key, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([event]),
  });
}
