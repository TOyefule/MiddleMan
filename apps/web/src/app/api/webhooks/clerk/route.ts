import { NextResponse, type NextRequest } from 'next/server';
import { Webhook } from 'svix';
import { getDb, schema, eq } from '@middleman/db';

interface ClerkUserEvent {
  data: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    phone_numbers: Array<{ phone_number: string }>;
  };
  type: string;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  let evt: ClerkUserEvent;
  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = getDb();

  // Idempotency
  const existing = await db
    .select({ id: schema.webhookEvents.id })
    .from(schema.webhookEvents)
    .where(eq(schema.webhookEvents.externalId, svixId))
    .limit(1);
  if (existing.length > 0) return NextResponse.json({ received: true });

  await db.insert(schema.webhookEvents).values({
    source: 'clerk',
    externalId: svixId,
    type: evt.type,
    payload: evt.data as unknown as Record<string, unknown>,
    signatureVerified: true,
  });

  const clerkUserId = evt.data.id;
  const email = evt.data.email_addresses[0]?.email_address;
  const phone = evt.data.phone_numbers[0]?.phone_number;

  switch (evt.type) {
    case 'user.created': {
      if (email) {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 30);
        await db.insert(schema.users).values({
          clerkUserId,
          email,
          phone,
          status: 'pending_verification',
          trialEndsAt,
        });
      }
      break;
    }
    case 'user.updated': {
      const updates: Record<string, string | null> = {};
      if (email) updates.email = email;
      if (phone) updates.phone = phone;
      if (Object.keys(updates).length > 0) {
        await db.update(schema.users).set(updates).where(eq(schema.users.clerkUserId, clerkUserId));
      }
      break;
    }
    case 'user.deleted': {
      await db.update(schema.users).set({ status: 'closed' }).where(eq(schema.users.clerkUserId, clerkUserId));
      break;
    }
  }

  await db
    .update(schema.webhookEvents)
    .set({ processedAt: new Date() })
    .where(eq(schema.webhookEvents.externalId, svixId));

  return NextResponse.json({ received: true });
}
