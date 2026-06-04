import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify, importJWK } from 'jose';
import { getDb, schema, eq } from '@middleman/db';
import { inngest } from '@middleman/jobs';

const PLAID_JWK_URL = 'https://api.plaid.com/.well-known/jwks.json';
let cachedJwks: { keys: Array<{ kid: string; [key: string]: unknown }> } | null = null;
let jwksExpiresAt: number = 0;

async function getPlaidJwks() {
  const now = Date.now();
  if (cachedJwks && jwksExpiresAt > now) {
    return cachedJwks;
  }

  try {
    const resp = await fetch(PLAID_JWK_URL);
    cachedJwks = await resp.json();
    jwksExpiresAt = now + 3600000; // 1 hour TTL
    return cachedJwks;
  } catch (error) {
    console.error('Failed to fetch Plaid JWKS:', error);
    return null;
  }
}

async function verifyPlaidSignature(
  token: string,
): Promise<{ verified: boolean; claims?: Record<string, unknown> }> {
  try {
    const jwks = await getPlaidJwks();
    if (!jwks) return { verified: false };

    const headerPayload = token.split('.')[0];
    const header = JSON.parse(Buffer.from(headerPayload, 'base64').toString());
    const kid = header.kid as string;

    const key = jwks.keys.find((k) => k.kid === kid);
    if (!key) {
      console.warn(`Unknown key ID in Plaid JWT: ${kid}`);
      return { verified: false };
    }

    const keyData = {
      kty: key.kty,
      ...(key.crv && { crv: key.crv }),
      ...(key.x && { x: key.x }),
      ...(key.y && { y: key.y }),
      ...(key.n && { n: key.n }),
      ...(key.e && { e: key.e }),
    };
    const secret = await importJWK(keyData as Parameters<typeof importJWK>[0]);
    const verified = await jwtVerify(token, secret);
    return { verified: true, claims: verified.payload };
  } catch (error) {
    console.error('Plaid signature verification failed:', error);
    return { verified: false };
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const webhookType = body.webhook_type as string;
  const webhookCode = body.webhook_code as string;
  const itemId = body.item_id as string;
  const externalId = `${itemId}_${webhookType}_${webhookCode}_${Date.now()}`;

  let signatureVerified = false;
  const jwkHeader = req.headers.get('plaid-verification');

  if (jwkHeader) {
    const verification = await verifyPlaidSignature(jwkHeader);
    signatureVerified = verification.verified;
    if (!signatureVerified) {
      console.warn(`Failed to verify webhook signature for itemId: ${itemId}`);
    }
  }

  const db = getDb();
  const existing = await db
    .select({ id: schema.webhookEvents.id })
    .from(schema.webhookEvents)
    .where(eq(schema.webhookEvents.externalId, externalId))
    .limit(1);
  if (existing.length > 0) return NextResponse.json({ received: true });

  await db.insert(schema.webhookEvents).values({
    source: 'plaid',
    externalId,
    type: `${webhookType}.${webhookCode}`,
    payload: body,
    signatureVerified,
  });

  if (webhookType === 'RECURRING_TRANSACTIONS' && webhookCode === 'RECURRING_TRANSACTIONS_UPDATE') {
    // Lookup userId from plaid_items table using itemId
    const [plaidItem] = await db
      .select({ userId: schema.plaidItems.userId })
      .from(schema.plaidItems)
      .where(eq(schema.plaidItems.itemId, itemId))
      .limit(1);

    if (plaidItem) {
      await inngest.send({
        name: 'plaid.recurring.updated',
        data: { itemId, userId: plaidItem.userId },
      });
    }
  }

  await db
    .update(schema.webhookEvents)
    .set({ processedAt: new Date() })
    .where(eq(schema.webhookEvents.externalId, externalId));

  return NextResponse.json({ received: true });
}
