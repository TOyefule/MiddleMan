import { randomUUID } from 'node:crypto';
import { getDb, schema, eq, and, gte, lte, sql } from '@middleman/db';
import type { Bill, BillLineItem, Charge, NewLedgerEntry } from '@middleman/db/types';

export type SaasTier = 'lite' | 'plus' | 'pro' | 'overage';

export const SAAS_TIER_PRICING: Record<SaasTier, { maxSubs: number; priceCents: number }> = {
  lite: { maxSubs: 5, priceCents: 599 },
  plus: { maxSubs: 10, priceCents: 1099 },
  pro: { maxSubs: 20, priceCents: 1999 },
  overage: { maxSubs: Infinity, priceCents: 1999 }, // base + $1/sub beyond 20
};

const OVERAGE_PER_SUB_CENTS = 100;

export function computeTier(activeSubCount: number): {
  tier: SaasTier;
  saasFeeCents: number;
  overageFeeCents: number;
} {
  if (activeSubCount <= 5) {
    return { tier: 'lite', saasFeeCents: SAAS_TIER_PRICING.lite.priceCents, overageFeeCents: 0 };
  }
  if (activeSubCount <= 10) {
    return { tier: 'plus', saasFeeCents: SAAS_TIER_PRICING.plus.priceCents, overageFeeCents: 0 };
  }
  if (activeSubCount <= 20) {
    return { tier: 'pro', saasFeeCents: SAAS_TIER_PRICING.pro.priceCents, overageFeeCents: 0 };
  }
  return {
    tier: 'overage',
    saasFeeCents: SAAS_TIER_PRICING.pro.priceCents,
    overageFeeCents: (activeSubCount - 20) * OVERAGE_PER_SUB_CENTS,
  };
}

export type CloseCycleInput = {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
};

/**
 * Assemble a bill for the closed cycle. Sums all captured charges in the window,
 * computes SaaS tier, writes bill + line items + double-entry ledger pairs.
 *
 * Returns the persisted bill. Caller (cycle-close Inngest job) then creates a
 * Stripe Invoice via `createStripeInvoiceForBill` and schedules the ACH debit.
 */
export async function closeCycle(input: CloseCycleInput): Promise<Bill> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const periodCharges = await tx
      .select()
      .from(schema.charges)
      .where(
        and(
          eq(schema.charges.userId, input.userId),
          eq(schema.charges.status, 'captured'),
          gte(schema.charges.occurredAt, input.periodStart),
          lte(schema.charges.occurredAt, input.periodEnd),
        ),
      );

    const passthroughCents = periodCharges.reduce((s, c) => s + c.amountCents, 0);

    const activeSubs = await tx
      .select({ c: sql<number>`count(*)::int` })
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.userId, input.userId),
          eq(schema.subscriptions.status, 'active'),
        ),
      );
    const activeSubCount = activeSubs[0]?.c ?? 0;
    const { tier, saasFeeCents, overageFeeCents } = computeTier(activeSubCount);

    const totalCents = passthroughCents + saasFeeCents + overageFeeCents;

    const [bill] = await tx
      .insert(schema.bills)
      .values({
        userId: input.userId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        dueDate: input.dueDate,
        passthroughSubtotalCents: passthroughCents,
        saasFeeCents,
        overageFeeCents,
        totalCents,
        status: 'open',
        issuedAt: new Date(),
      })
      .returning();

    if (!bill) throw new Error('Failed to insert bill');

    const lineItems: BillLineItem[] = [];
    for (const c of periodCharges) {
      const [li] = await tx
        .insert(schema.billLineItems)
        .values({
          billId: bill.id,
          type: 'passthrough',
          chargeId: c.id,
          description: `Passthrough charge ${c.id}`,
          amountCents: c.amountCents,
        })
        .returning();
      if (li) lineItems.push(li);
    }
    await tx.insert(schema.billLineItems).values({
      billId: bill.id,
      type: 'saas_fee',
      description: `MiddleMan ${tier} (${activeSubCount} subs)`,
      amountCents: saasFeeCents,
    });
    if (overageFeeCents > 0) {
      await tx.insert(schema.billLineItems).values({
        billId: bill.id,
        type: 'overage_fee',
        description: `${activeSubCount - 20} subs over plan`,
        amountCents: overageFeeCents,
      });
    }

    await writeBillLedger(tx, { bill, passthroughCents, saasFeeCents, overageFeeCents });

    await tx.update(schema.users).set({ saasTier: tier }).where(eq(schema.users.id, input.userId));

    return bill;
  });
}

type TxLike = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

async function writeBillLedger(
  tx: TxLike,
  args: { bill: Bill; passthroughCents: number; saasFeeCents: number; overageFeeCents: number },
) {
  const txId = randomUUID();
  const entries: NewLedgerEntry[] = [];

  // Passthrough: we move what we floated out of asset_float into receivable from user
  if (args.passthroughCents > 0) {
    entries.push(
      {
        transactionId: txId,
        account: 'asset_receivable',
        debitCents: args.passthroughCents,
        billId: args.bill.id,
        description: 'Bill issued — passthrough receivable',
      },
      {
        transactionId: txId,
        account: 'asset_float',
        creditCents: args.passthroughCents,
        billId: args.bill.id,
        description: 'Bill issued — float recovered',
      },
    );
  }

  // SaaS fee: receivable from user → revenue
  if (args.saasFeeCents > 0) {
    entries.push(
      {
        transactionId: txId,
        account: 'asset_receivable',
        debitCents: args.saasFeeCents,
        billId: args.bill.id,
        description: 'Bill issued — SaaS fee receivable',
      },
      {
        transactionId: txId,
        account: 'revenue_saas',
        creditCents: args.saasFeeCents,
        billId: args.bill.id,
        description: 'Bill issued — SaaS revenue',
      },
    );
  }

  if (args.overageFeeCents > 0) {
    entries.push(
      {
        transactionId: txId,
        account: 'asset_receivable',
        debitCents: args.overageFeeCents,
        billId: args.bill.id,
        description: 'Bill issued — overage receivable',
      },
      {
        transactionId: txId,
        account: 'revenue_overage',
        creditCents: args.overageFeeCents,
        billId: args.bill.id,
        description: 'Bill issued — overage revenue',
      },
    );
  }

  if (entries.length > 0) {
    await tx.insert(schema.ledgerEntries).values(entries);
  }
}

/**
 * Record a Stripe Issuing capture into our ledger and increment denormalized counters.
 * Called from the Inngest worker after the Edge webhook acks the authorization.
 */
export async function recordCharge(input: {
  userId: string;
  subscriptionId: string;
  virtualCardId: string;
  stripeAuthorizationId: string;
  amountCents: number;
}): Promise<Charge> {
  const db = getDb();
  const txId = randomUUID();

  return db.transaction(async (tx) => {
    const [charge] = await tx
      .insert(schema.charges)
      .values({
        userId: input.userId,
        subscriptionId: input.subscriptionId,
        virtualCardId: input.virtualCardId,
        stripeAuthorizationId: input.stripeAuthorizationId,
        amountCents: input.amountCents,
        status: 'captured',
      })
      .returning();

    if (!charge) throw new Error('Failed to insert charge');

    await tx.insert(schema.ledgerEntries).values([
      {
        transactionId: txId,
        account: 'asset_float',
        debitCents: input.amountCents,
        chargeId: charge.id,
        description: 'Provider charge — float advanced',
      },
      {
        transactionId: txId,
        account: 'liability_provider_owed',
        creditCents: input.amountCents,
        chargeId: charge.id,
        description: 'Provider charge — owed to Stripe Issuing',
      },
    ]);

    await tx
      .update(schema.users)
      .set({
        currentPeriodSpentCents: sql`${schema.users.currentPeriodSpentCents} + ${input.amountCents}`,
      })
      .where(eq(schema.users.id, input.userId));

    await tx
      .update(schema.virtualCards)
      .set({
        currentCycleSpentCents: sql`${schema.virtualCards.currentCycleSpentCents} + ${input.amountCents}`,
      })
      .where(eq(schema.virtualCards.id, input.virtualCardId));

    return charge;
  });
}
