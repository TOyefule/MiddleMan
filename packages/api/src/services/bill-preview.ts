import { getDb, schema, eq, and } from '@middleman/db';
import type { Bill, BillLineItem } from '@middleman/db';

export interface BillPreviewLineItem extends BillLineItem {
  displayName: string;
  displayAmount: string;
}

export interface BillPreview {
  billId: string;
  status: 'draft' | 'open' | 'pending_collection' | 'paid' | 'past_due' | 'uncollectible';
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  lineItems: BillPreviewLineItem[];
  subtotalCents: number;
  lateFeesCents: number;
  adjustmentsCents: number;
  totalCents: number;
  paidCents: number;
  remainingCents: number;
  paidAt?: Date;
  paymentMethods: Array<{
    id: string;
    displayName: string;
    last4: string;
    type: 'ach_debit' | 'card';
    isPrimary: boolean;
  }>;
}

/**
 * Get the current cycle bill for a user.
 * Returns the live bill with all charges, fees, adjustments, and payment status.
 */
export async function getCurrentCycleBill(userId: string): Promise<BillPreview | null> {
  const db = getDb();

  // Get the most recent "open" or "pending_collection" bill (current cycle)
  const [bill] = await db
    .select()
    .from(schema.bills)
    .where(
      and(
        eq(schema.bills.userId, userId),
        // Status is open or pending_collection (current cycle)
      ),
    )
    .orderBy((b) => ({ order: 'desc', value: b.createdAt }))
    .limit(1);

  if (!bill || (bill.status !== 'open' && bill.status !== 'pending_collection')) {
    return null;
  }

  // Get line items
  const lineItems = await db
    .select()
    .from(schema.billLineItems)
    .where(eq(schema.billLineItems.billId, bill.id));

  // Get payment methods
  const paymentMethods = await db
    .select()
    .from(schema.paymentMethods)
    .where(eq(schema.paymentMethods.userId, userId));

  // Calculate subtotal (subscription charges only)
  const subscriptionLineItems = lineItems.filter((li) => li.type === 'subscription');
  const subtotalCents = subscriptionLineItems.reduce((sum, li) => sum + li.amountCents, 0);

  // Calculate fees (late fees)
  const lateFeesCents = lineItems
    .filter((li) => li.type === 'late_fee')
    .reduce((sum, li) => sum + li.amountCents, 0);

  // Calculate adjustments (credits/charges)
  const adjustmentsCents = lineItems
    .filter((li) => li.type === 'adjustment')
    .reduce((sum, li) => sum + li.amountCents, 0);

  // Format line items for display
  const displayLineItems: BillPreviewLineItem[] = lineItems.map((li) => ({
    ...li,
    displayName: formatLineItemName(li.type, li.description),
    displayAmount: formatCents(li.amountCents),
  }));

  return {
    billId: bill.id,
    status: bill.status,
    periodStart: bill.periodStart,
    periodEnd: bill.periodEnd,
    dueDate: bill.dueDate,
    lineItems: displayLineItems,
    subtotalCents,
    lateFeesCents,
    adjustmentsCents,
    totalCents: bill.totalCents,
    paidCents: bill.paidCents,
    remainingCents: Math.max(0, bill.totalCents - bill.paidCents),
    paidAt: bill.paidAt,
    paymentMethods: paymentMethods
      .filter((pm) => !pm.deletedAt)
      .map((pm) => ({
        id: pm.id,
        displayName: pm.displayName || formatPaymentMethodType(pm.type),
        last4: pm.last4 || '••••',
        type: pm.type,
        isPrimary: pm.isPrimary,
      })),
  };
}

/**
 * Get a specific bill with full details.
 * Used in admin delinquencies detail view.
 */
export async function getBillDetail(billId: string, userId: string): Promise<BillPreview | null> {
  const db = getDb();

  // Fetch bill (verify ownership)
  const [bill] = await db
    .select()
    .from(schema.bills)
    .where(and(eq(schema.bills.id, billId), eq(schema.bills.userId, userId)))
    .limit(1);

  if (!bill) return null;

  // Get line items
  const lineItems = await db
    .select()
    .from(schema.billLineItems)
    .where(eq(schema.billLineItems.billId, bill.id));

  // Get payment methods
  const paymentMethods = await db
    .select()
    .from(schema.paymentMethods)
    .where(eq(schema.paymentMethods.userId, userId));

  // Calculate totals
  const subscriptionLineItems = lineItems.filter((li) => li.type === 'subscription');
  const subtotalCents = subscriptionLineItems.reduce((sum, li) => sum + li.amountCents, 0);

  const lateFeesCents = lineItems
    .filter((li) => li.type === 'late_fee')
    .reduce((sum, li) => sum + li.amountCents, 0);

  const adjustmentsCents = lineItems
    .filter((li) => li.type === 'adjustment')
    .reduce((sum, li) => sum + li.amountCents, 0);

  // Format line items
  const displayLineItems: BillPreviewLineItem[] = lineItems.map((li) => ({
    ...li,
    displayName: formatLineItemName(li.type, li.description),
    displayAmount: formatCents(li.amountCents),
  }));

  return {
    billId: bill.id,
    status: bill.status,
    periodStart: bill.periodStart,
    periodEnd: bill.periodEnd,
    dueDate: bill.dueDate,
    lineItems: displayLineItems,
    subtotalCents,
    lateFeesCents,
    adjustmentsCents,
    totalCents: bill.totalCents,
    paidCents: bill.paidCents,
    remainingCents: Math.max(0, bill.totalCents - bill.paidCents),
    paidAt: bill.paidAt,
    paymentMethods: paymentMethods
      .filter((pm) => !pm.deletedAt)
      .map((pm) => ({
        id: pm.id,
        displayName: pm.displayName || formatPaymentMethodType(pm.type),
        last4: pm.last4 || '••••',
        type: pm.type,
        isPrimary: pm.isPrimary,
      })),
  };
}

/**
 * Get all bills for a user (for bill history).
 */
export async function getBillHistory(userId: string, limit = 12): Promise<Bill[]> {
  const db = getDb();

  return db
    .select()
    .from(schema.bills)
    .where(eq(schema.bills.userId, userId))
    .orderBy((b) => ({ order: 'desc', value: b.createdAt }))
    .limit(limit);
}

/**
 * Helper: Format line item type + description for display.
 */
function formatLineItemName(type: string, description?: string | null): string {
  if (description) return description;

  const typeMap: Record<string, string> = {
    subscription: 'Subscription Charge',
    late_fee: 'Late Fee',
    adjustment: 'Adjustment',
    credit: 'Credit',
    overage: 'Overage Charge',
  };

  return typeMap[type] || 'Charge';
}

/**
 * Helper: Format cents to USD string.
 */
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Helper: Format payment method type for display.
 */
function formatPaymentMethodType(type: string): string {
  const typeMap: Record<string, string> = {
    ach_debit: 'ACH Debit',
    card: 'Card',
    plaid: 'Bank Account',
  };
  return typeMap[type] || type;
}
