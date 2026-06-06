import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb, schema } from '@middleman/db';
import { sql } from 'drizzle-orm';

const baseSchema = z.object({
  product: z.enum(['middleman', 'sentinel']),
  email: z.string().email(),
  firstName: z.string().min(1).max(80).optional(),
  tier: z.string().min(1).max(40),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
});

const middlemanSchema = baseSchema.extend({
  product: z.literal('middleman'),
  subCount: z.string().optional(),
  monthlySpend: z.string().optional(),
});

const sentinelSchema = baseSchema.extend({
  product: z.literal('sentinel'),
  companyName: z.string().min(1).max(200).optional(),
  role: z.string().optional(),
  companySize: z.string().optional(),
  saasToolCount: z.string().optional(),
  biggestChallenge: z.string().optional(),
});

const bodySchema = z.discriminatedUnion('product', [middlemanSchema, sentinelSchema]);

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;

  try {
    const db = getDb();

    const entry: typeof schema.waitlistEntries.$inferInsert = {
      product: data.product,
      email: data.email.toLowerCase().trim(),
      firstName: data.firstName,
      tier: data.tier,
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      ...(data.product === 'middleman'
        ? { subCount: data.subCount, monthlySpend: data.monthlySpend }
        : {
            companyName: data.companyName,
            role: data.role,
            companySize: data.companySize,
            saasToolCount: data.saasToolCount,
            biggestChallenge: data.biggestChallenge,
          }),
    };

    await db.insert(schema.waitlistEntries).values(entry);

    // Count position on waitlist
    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(schema.waitlistEntries)
      .where(sql`product = ${data.product}`);

    return NextResponse.json({ success: true, position: count }, { status: 201 });
  } catch (err: unknown) {
    // Unique constraint = already on the list
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return NextResponse.json({ success: true, duplicate: true }, { status: 200 });
    }
    console.error('[waitlist] insert error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
