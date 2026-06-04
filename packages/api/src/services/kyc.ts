import { getDb, schema, eq } from '@middleman/db';
import { getStripe } from '../lib/stripe';

export async function getStatus(input: { userId: string }) {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(schema.kycProfiles)
    .where(eq(schema.kycProfiles.userId, input.userId))
    .limit(1);
  return profile ?? null;
}

export async function startStripeIdentitySession(input: { userId: string }) {
  const db = getDb();
  const stripe = getStripe();

  let [profile] = await db
    .select()
    .from(schema.kycProfiles)
    .where(eq(schema.kycProfiles.userId, input.userId))
    .limit(1);

  if (!profile) {
    [profile] = await db
      .insert(schema.kycProfiles)
      .values({ userId: input.userId, level: 'light', status: 'not_started' })
      .returning();
  }
  if (!profile) throw new Error('Failed to upsert KYC profile');

  const session = await stripe.identity.verificationSessions.create({
    type: 'document',
    metadata: { user_id: input.userId },
    options: { document: { require_matching_selfie: true, require_live_capture: true } },
  });

  await db
    .update(schema.kycProfiles)
    .set({ status: 'pending', stripeIdentitySessionId: session.id })
    .where(eq(schema.kycProfiles.id, profile.id));

  return { url: session.url, clientSecret: session.client_secret };
}
