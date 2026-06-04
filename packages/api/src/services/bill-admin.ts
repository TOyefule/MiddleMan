import { randomUUID } from 'node:crypto';
import { getDb, schema, eq } from '@middleman/db';
import { inngest } from '@middleman/jobs';

/**
 * Admin service for bill adjustments, waivers, and status management.
 * All operations are idempotent and emit events for notifications.
 */

/**
 * Adjust a bill by adding or subtracting a charge.
 * Adjustment is recorded as a line item and ledger entry.
 * Positive amountCents = charge, negative = credit.
 */
export async function adjustBill(input: {
  billId: string;
  amountCents: number;
  reason: string;
  adminId: string;
}): Promise<{ success: boolean; adjustmentId: string; newTotal: number }> {
  const db = getDb();

  const [bill] = await db
    .select()
    .from(schema.bills)
    .where(eq(schema.bills.id, input.billId))
    .limit(1);

  if (!bill) throw new Error(`Bill ${input.billId} not found`);

  // Prevent adjustments on paid bills
  if (bill.status === 'paid') {
    throw new Error(`Cannot adjust paid bill ${input.billId}`);
  }

  const adjustmentId = randomUUID();

  // Apply adjustment in transaction
  await db.transaction(async (tx) => {
    // Update bill total
    const newTotal = bill.totalCents + input.amountCents;
    await tx
      .update(schema.bills)
      .set({ totalCents: newTotal })
      .where(eq(schema.bills.id, input.billId));

    // Create line item for adjustment
    await tx.insert(schema.billLineItems).values({
      billId: input.billId,
      type: 'adjustment',
      description: `Adjustment: ${input.reason}`,
      amountCents: input.amountCents,
    });

    // Write ledger entries
    // If positive adjustment (charge): Dr. asset_receivable, Cr. revenue_adjustment
    // If negative adjustment (credit): Cr. asset_receivable, Dr. revenue_adjustment
    const txId = randomUUID();

    if (input.amountCents > 0) {
      // Charge adjustment
      await tx.insert(schema.ledgerEntries).values([
        {
          transactionId: txId,
          account: 'asset_receivable',
          debitCents: input.amountCents,
          billId: input.billId,
          description: `Adjustment charge: ${input.reason}`,
        },
        {
          transactionId: txId,
          account: 'revenue_adjustment',
          creditCents: input.amountCents,
          billId: input.billId,
          description: `Adjustment charge: ${input.reason}`,
        },
      ]);
    } else {
      // Credit adjustment
      await tx.insert(schema.ledgerEntries).values([
        {
          transactionId: txId,
          account: 'asset_receivable',
          creditCents: Math.abs(input.amountCents),
          billId: input.billId,
          description: `Adjustment credit: ${input.reason}`,
        },
        {
          transactionId: txId,
          account: 'revenue_adjustment',
          debitCents: Math.abs(input.amountCents),
          billId: input.billId,
          description: `Adjustment credit: ${input.reason}`,
        },
      ]);
    }
  });

  // Emit event
  await inngest.send({
    name: 'bill.adjusted',
    data: { billId: input.billId, amountCents: input.amountCents, reason: input.reason },
  });

  return { success: true, adjustmentId, newTotal: bill.totalCents + input.amountCents };
}

/**
 * Waive a late fee on a bill.
 * Records the waiver as a credit line item and adjusts receivables.
 * Idempotent: returns false if fee already waived.
 */
export async function waiveFee(input: {
  billId: string;
  reason: string;
  adminId: string;
}): Promise<{ success: boolean; waiverAmount: number; credited: boolean }> {
  const db = getDb();

  const [bill] = await db
    .select()
    .from(schema.bills)
    .where(eq(schema.bills.id, input.billId))
    .limit(1);

  if (!bill) throw new Error(`Bill ${input.billId} not found`);

  // Can't waive fee on paid bill
  if (bill.status === 'paid') {
    throw new Error(`Cannot waive fee on paid bill ${input.billId}`);
  }

  // Check if fee exists
  if (bill.lateFeeCents === 0) {
    return { success: false, waiverAmount: 0, credited: false };
  }

  const waiverAmount = bill.lateFeeCents;

  // Apply waiver in transaction
  await db.transaction(async (tx) => {
    // Update bill: remove late fee, reduce total
    const newTotal = bill.totalCents - waiverAmount;
    await tx
      .update(schema.bills)
      .set({
        lateFeeCents: 0,
        totalCents: newTotal,
      })
      .where(eq(schema.bills.id, input.billId));

    // Create line item for waiver (negative amount = credit)
    await tx.insert(schema.billLineItems).values({
      billId: input.billId,
      type: 'adjustment',
      description: `Late fee waived: ${input.reason}`,
      amountCents: -waiverAmount,
    });

    // Write ledger entries for waiver
    // Cr. asset_receivable (reduce AR), Cr. revenue_late (remove late fee revenue)
    const txId = randomUUID();
    await tx.insert(schema.ledgerEntries).values([
      {
        transactionId: txId,
        account: 'asset_receivable',
        creditCents: waiverAmount,
        billId: input.billId,
        description: `Late fee waived: ${input.reason}`,
      },
      {
        transactionId: txId,
        account: 'revenue_late',
        creditCents: waiverAmount,
        billId: input.billId,
        description: `Late fee waived: ${input.reason}`,
      },
    ]);
  });

  // Emit event
  await inngest.send({
    name: 'bill.fee_waived',
    data: { billId: input.billId, waiverAmount, reason: input.reason },
  });

  return { success: true, waiverAmount, credited: true };
}

/**
 * Manually mark a bill as past due.
 * Used when collection is deferred manually.
 */
export async function markPastDue(input: {
  billId: string;
  reason: string;
  adminId: string;
}): Promise<void> {
  const db = getDb();

  const [bill] = await db
    .select()
    .from(schema.bills)
    .where(eq(schema.bills.id, input.billId))
    .limit(1);

  if (!bill) throw new Error(`Bill ${input.billId} not found`);

  // Prevent downgrading from paid/uncollectible
  if (bill.status === 'paid' || bill.status === 'uncollectible') {
    throw new Error(`Cannot mark ${bill.status} bill as past due`);
  }

  await db
    .update(schema.bills)
    .set({ status: 'past_due' })
    .where(eq(schema.bills.id, input.billId));

  await inngest.send({
    name: 'bill.marked_past_due',
    data: { billId: input.billId, reason: input.reason },
  });
}

/**
 * Clear the uncollectible status and return a bill to pending collection.
 * Used when customer contacts to resolve delinquency.
 */
export async function clearUncollectible(input: {
  billId: string;
  reason: string;
  adminId: string;
}): Promise<void> {
  const db = getDb();

  const [bill] = await db
    .select()
    .from(schema.bills)
    .where(eq(schema.bills.id, input.billId))
    .limit(1);

  if (!bill) throw new Error(`Bill ${bill} not found`);

  if (bill.status !== 'uncollectible') {
    throw new Error(`Bill ${input.billId} is not in uncollectible status`);
  }

  await db
    .update(schema.bills)
    .set({ status: 'pending_collection' })
    .where(eq(schema.bills.id, input.billId));

  await inngest.send({
    name: 'bill.uncollectible_cleared',
    data: { billId: input.billId, reason: input.reason },
  });
}

/**
 * Get delinquency summary for a bill.
 * Used in admin delinquencies view.
 */
export async function getDelinquencySummary(billId: string) {
  const db = getDb();

  const [bill] = await db
    .select()
    .from(schema.bills)
    .where(eq(schema.bills.id, billId))
    .limit(1);

  if (!bill) throw new Error(`Bill ${billId} not found`);

  // Get attempt count
  const attempts = await db
    .select()
    .from(schema.dunningAttempts)
    .where(eq(schema.dunningAttempts.billId, billId));

  // Calculate days overdue
  const daysOverdue = Math.floor(
    (Date.now() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    billId: bill.id,
    status: bill.status,
    totalCents: bill.totalCents,
    paidCents: bill.paidCents,
    remainingCents: Math.max(0, bill.totalCents - bill.paidCents),
    lateFeeCents: bill.lateFeeCents,
    dueDate: bill.dueDate,
    daysOverdue,
    attemptCount: attempts.length,
    lastAttemptAt: attempts.length > 0 ? attempts[attempts.length - 1].attemptedAt : null,
    failureCode: attempts.length > 0 ? attempts[attempts.length - 1].failureCode : null,
  };
}
