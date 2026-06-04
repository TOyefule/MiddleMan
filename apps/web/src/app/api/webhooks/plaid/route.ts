import { NextResponse, type NextRequest } from 'next/server';
import { getDb, schema, eq } from '@middleman/db';
import { inngest } from '@middleman/jobs';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const webhookType = body.webhook_type as string;
  const webhookCode = body.webhook_code as string;
  const itemId = body.item_id as string;
  const externalId = `${itemId}_${webhookType}_${webhookCode}_${Date.now()}`;

  // TODO: verify Plaid webhook JWK signature (M2 implementation)

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
    signatureVerified: false, // TODO: set true after JWK verification
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
