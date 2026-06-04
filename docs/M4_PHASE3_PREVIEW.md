# M4 Phase 3: Bill Preview & Lifecycle

**Status**: Complete  
**Timeline**: Bill preview, admin adjustments, delinquencies dashboard  
**Deliverable**: User-facing bill preview, admin bill management, full delinquencies UI support

---

## Overview

Phase 3 enables users to view their current cycle bill in real-time and gives ops/admin teams the tools to manage delinquencies through adjustments, waivers, and status overrides.

**Components**:
- **Bill Preview Service**: Live current cycle bill with charges, fees, adjustments
- **Admin Bill Management**: Adjust charges, waive fees, clear statuses
- **Delinquencies Dashboard**: List past due/uncollectible bills with full dunning history
- **Event System**: All adjustments emit events for notifications and auditing

---

## Bill Preview

### Service Layer (`packages/api/src/services/bill-preview.ts`)

#### `getCurrentCycleBill(userId: string): Promise<BillPreview | null>`

Fetches the user's live current cycle bill (status `open` or `pending_collection`).

**Returns**:
```typescript
interface BillPreview {
  billId: string;
  status: 'draft' | 'open' | 'pending_collection' | 'paid' | 'past_due' | 'uncollectible';
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  lineItems: Array<{
    id: string;
    type: 'subscription' | 'late_fee' | 'adjustment' | 'credit' | 'overage';
    description: string;
    displayName: string;
    amountCents: number;
    displayAmount: string;
  }>;
  subtotalCents: number;        // Subscription charges only
  lateFeesCents: number;        // Late fees
  adjustmentsCents: number;     // Admin adjustments (net)
  totalCents: number;           // Final total due
  paidCents: number;            // Amount paid so far
  remainingCents: number;       // Amount still outstanding
  paidAt?: Date;
  paymentMethods: Array<{
    id: string;
    displayName: string;
    last4: string;
    type: 'ach_debit' | 'card';
    isPrimary: boolean;
  }>;
}
```

**Usage**: Called by `bills.preview()` tRPC query for user-facing bill detail screen.

---

#### `getBillDetail(billId: string, userId: string): Promise<BillPreview | null>`

Fetches a specific bill with full details. Verifies ownership before returning.

**Usage**: Called by admin delinquencies.get endpoint to fetch full bill detail.

---

#### `getBillHistory(userId: string, limit?: number): Promise<Bill[]>`

Fetches user's bill history ordered by creation date (most recent first).

**Usage**: For bill list/history screens.

---

### tRPC Endpoint

**Query**: `bills.preview()`

```typescript
bills.preview() → BillPreview | null
```

**Usage**: User dashboard to show current cycle bill at a glance.

**Example Response**:
```json
{
  "billId": "bill-123",
  "status": "pending_collection",
  "periodStart": "2026-05-01T00:00:00Z",
  "periodEnd": "2026-05-31T23:59:59Z",
  "dueDate": "2026-06-04T23:59:59Z",
  "lineItems": [
    {
      "id": "li-1",
      "type": "subscription",
      "description": "Netflix Premium",
      "displayName": "Netflix Premium",
      "amountCents": 1299,
      "displayAmount": "$12.99"
    },
    {
      "id": "li-2",
      "type": "late_fee",
      "description": "Late fee — payment past due",
      "displayName": "Late Fee",
      "amountCents": 1500,
      "displayAmount": "$15.00"
    }
  ],
  "subtotalCents": 1299,
  "lateFeesCents": 1500,
  "adjustmentsCents": 0,
  "totalCents": 2799,
  "paidCents": 0,
  "remainingCents": 2799,
  "paymentMethods": [
    {
      "id": "pm-1",
      "displayName": "ACH Debit",
      "last4": "4242",
      "type": "ach_debit",
      "isPrimary": true
    }
  ]
}
```

---

## Admin Bill Management

### Service Layer (`packages/api/src/services/bill-admin.ts`)

#### `adjustBill(input: {billId, amountCents, reason, adminId}): Promise<{success, adjustmentId, newTotal}>`

Add or subtract a charge from a bill.

**Behavior**:
- Positive `amountCents` = charge (increases total)
- Negative `amountCents` = credit (decreases total)
- Creates line item with type `'adjustment'`
- Writes double-entry ledger:
  - **Charge**: Dr. asset_receivable, Cr. revenue_adjustment
  - **Credit**: Cr. asset_receivable, Dr. revenue_adjustment
- Emits `bill.adjusted` event
- Prevents adjustments on paid bills

**Example**:
```typescript
// Add $10 charge for overage
await adjustBill({
  billId: 'bill-123',
  amountCents: 1000,
  reason: 'Overage charge for extra users',
  adminId: 'admin-1'
});

// Credit $5 as goodwill gesture
await adjustBill({
  billId: 'bill-123',
  amountCents: -500,
  reason: 'Customer courtesy credit',
  adminId: 'admin-1'
});
```

---

#### `waiveFee(input: {billId, reason, adminId}): Promise<{success, waiverAmount, credited}>`

Remove a late fee from a bill.

**Behavior**:
- Checks if bill has `lateFeeCents > 0`
- Returns `{success: false}` if no fee exists (idempotent)
- Removes late fee from bill total
- Creates negative line item (credit)
- Writes double-entry ledger: Cr. asset_receivable, Cr. revenue_late
- Emits `bill.fee_waived` event
- Prevents waivers on paid bills

**Example**:
```typescript
await waiveFee({
  billId: 'bill-123',
  reason: 'Fee waived due to system error',
  adminId: 'admin-1'
});
// Returns: { success: true, waiverAmount: 1500, credited: true }
```

---

#### `markPastDue(input: {billId, reason, adminId}): Promise<void>`

Manually mark a bill as past due (status override).

**Behavior**:
- Updates status: `open`/`pending_collection` → `past_due`
- Prevents downgrade from `paid`/`uncollectible`
- Emits `bill.marked_past_due` event

**Use Case**: Ops manually extends collection window or defers to date-based escalation.

---

#### `clearUncollectible(input: {billId, reason, adminId}): Promise<void>`

Clear uncollectible status and return bill to pending collection.

**Behavior**:
- Requires current status: `uncollectible`
- Sets status: `uncollectible` → `pending_collection`
- Allows retry flow to trigger again
- Emits `bill.uncollectible_cleared` event

**Use Case**: Customer contacts to resolve delinquency; ops clears status to allow retry.

---

#### `getDelinquencySummary(billId: string)`

Returns quick summary for delinquencies list view.

**Returns**:
```typescript
{
  billId: string;
  status: 'past_due' | 'uncollectible';
  totalCents: number;
  paidCents: number;
  remainingCents: number;
  lateFeeCents: number;
  dueDate: Date;
  daysOverdue: number;
  attemptCount: number;
  lastAttemptAt?: Date;
  failureCode?: string;
}
```

---

### tRPC Admin Endpoints

**Mutation**: `admin.bills.adjust()`
```typescript
adjust({
  billId: string,
  amountCents: number,
  reason: string
}) → { success, adjustmentId, newTotal }
```

---

**Mutation**: `admin.bills.waiveFee()`
```typescript
waiveFee({
  billId: string,
  reason: string
}) → { success, waiverAmount, credited }
```

---

**Mutation**: `admin.bills.markPastDue()`
```typescript
markPastDue({
  billId: string,
  reason: string
}) → { success: true }
```

---

**Mutation**: `admin.bills.clearUncollectible()`
```typescript
clearUncollectible({
  billId: string,
  reason: string
}) → { success: true }
```

---

**Query**: `admin.bills.getDelinquencySummary()`
```typescript
getDelinquencySummary({
  billId: string
}) → DelinquencySummary
```

---

## Delinquencies Dashboard

### Admin Endpoints

#### `admin.delinquencies.list()`

Lists all past due and uncollectible bills with enriched summary data.

**Returns**:
```typescript
Array<{
  billId: string;
  userId: string;
  companyName: string;
  totalCents: number;
  paidCents: number;
  remainingCents: number;
  lateFeeCents: number;
  status: 'past_due' | 'uncollectible';
  dueDate: Date;
  daysOverdue: number;
  attemptCount: number;
  lastAttemptAt?: Date;
  failureCode?: string;
}>
```

**Usage**: Delinquencies list view with sorting/filtering by days overdue, attempt count, status.

---

#### `admin.delinquencies.get({ billId })`

Fetch complete delinquency detail with bill, user, line items, and dunning history.

**Returns**:
```typescript
{
  bill: {
    id: string;
    status: 'past_due' | 'uncollectible';
    periodStart: Date;
    periodEnd: Date;
    dueDate: Date;
    daysOverdue: number;
    totalCents: number;
    paidCents: number;
    remainingCents: number;
    lateFeeCents: number;
  };
  user: {
    id: string;
    companyName: string;
    email: string;
  };
  preview: BillPreview;  // Full bill detail with line items
  dunningHistory: Array<{
    attemptNo: number;
    method: 'smart_retry' | 'fallback' | 'ops_review';
    status: 'scheduled' | 'attempted' | 'succeeded' | 'failed';
    failureCode?: string;
    failureMessage?: string;
    attemptedAt: Date;
    nextRetryAt?: Date;
  }>;
}
```

**Usage**: Delinquencies detail view where ops can:
- View full bill with all charges, fees, adjustments
- See customer info and contact details
- Review complete dunning attempt history
- Adjust charges, waive fees, mark past due, or clear uncollectible status

---

## Bill Status Lifecycle

```
draft
  ↓
open (cycle running, no payment yet)
  ↓
pending_collection (payment being collected)
  ├─ ✅ paid (payment succeeded)
  ├─ ❌ past_due (payment failed, retry scheduled)
  │    ├─ ✅ paid (retry succeeded)
  │    └─ ❌ uncollectible (5+ attempts or 7+ days overdue)
  │         ├─ ✅ paid (manual resolution)
  │         └─ 🔄 pending_collection (ops clears status, retry triggered)
  └─ ✅ paid (collected before retry needed)

Legend:
  draft → open → pending_collection: Automatic transitions
  ❌ past_due: Triggered by first payment failure (Dunning Phase 2)
  ❌ uncollectible: Triggered by 5+ attempts or 7+ days overdue (Dunning Phase 2)
  🔄 pending_collection: Manual ops action via clearUncollectible()
```

---

## Events Emitted

### `bill.adjusted`
```typescript
data: { billId: string; amountCents: number; reason: string }
```
**Listener**: Notifications service (future) to email customer about adjustment

---

### `bill.fee_waived`
```typescript
data: { billId: string; waiverAmount: number; reason: string }
```
**Listener**: Notifications service to celebrate fee waiver, encourage payment

---

### `bill.marked_past_due`
```typescript
data: { billId: string; reason: string }
```
**Listener**: Admin logging/audit trail

---

### `bill.uncollectible_cleared`
```typescript
data: { billId: string; reason: string }
```
**Listener**: Triggers payment retry flow again via paymentRetryJob

---

## Ledger Accounting

### Bill Adjustment (Charge)
```
Dr. asset_receivable    $10.00   (receivable increased)
Cr. revenue_adjustment  $10.00   (new revenue)
```

### Bill Adjustment (Credit)
```
Dr. revenue_adjustment  $5.00    (reduce miscellaneous revenue)
Cr. asset_receivable    $5.00    (reduce receivable)
```

### Late Fee Waiver
```
Dr. revenue_late       $15.00    (remove late fee revenue)
Cr. asset_receivable   $15.00    (reduce receivable by waived amount)
```

---

## Database Changes

### bills table
- Status transitions tracked: `open` → `pending_collection` → `past_due`/`uncollectible` → `paid`
- All changes logged via events for audit trail

### billLineItems table
- New rows added for:
  - Admin adjustments (type='adjustment', positive/negative amounts)
  - Fee waivers (type='adjustment', negative amount)

### ledgerEntries table
- All adjustments and waivers recorded with transactionId for reconciliation
- Accounts used: asset_receivable, revenue_adjustment, revenue_late

---

## Configuration

No new environment variables required.

---

## Error Handling

All admin mutations validate input and return typed responses:
- `adjustBill()`: Throws on bill not found, bill already paid
- `waiveFee()`: Returns false if no fee to waive (idempotent)
- `markPastDue()`: Throws on invalid status transition
- `clearUncollectible()`: Throws if bill is not uncollectible

---

## Idempotency

- **Fee Waiver**: Idempotent on amount (returns false if no fee exists)
- **Adjustments**: Idempotent on line item (multiple calls create multiple line items — admin must audit)
- **Status Changes**: Idempotent on status update (setting same status twice is safe)

---

## Testing

### Manual Tests
1. **Preview Endpoint**
   - Create bill in open status
   - Call `bills.preview()`
   - Verify bill data, line items, payment methods returned
   
2. **Delinquencies List**
   - Create past_due bill
   - Call `admin.delinquencies.list()`
   - Verify bill appears with correct daysOverdue, attemptCount
   
3. **Adjustment**
   - Call `admin.bills.adjust()` with positive amount
   - Verify new total increased, line item created, ledger entries written
   
4. **Fee Waiver**
   - Call `admin.bills.waiveFee()`
   - Verify late fee removed, total decreased, ledger entry written
   - Call again — verify idempotent response

### Integration Tests
- Dunning triggers → late fee assessed → admin waivers fee → verify bill total
- Bill in uncollectible → ops clears status → payment retry triggered
- Admin adjusts bill → `bill.adjusted` event emitted → notifications service receives it

---

## Success Metrics

- **Preview load**: <500ms for current cycle bill
- **Admin adjustments**: Ledger consistency maintained (balanced entries)
- **Fee waiver idempotency**: 100% of repeated calls return false without side effects
- **Delinquencies list**: <1s for 200 bills with enrichment

---

## Future Enhancements (M4+)

1. **Bulk Operations**
   - Waive fees for cohort of customers (e.g., all created in date range)
   - Adjust charges in bulk with CSV upload
   - Escalate multiple bills to Slack in one action

2. **Audit Trail UI**
   - Show all adjustments, waivers, status changes with timestamps
   - Who made the change (admin name)
   - Reason for change
   - Linked to notifications sent to customer

3. **Customizable Escalation Criteria**
   - Admin can override escalation thresholds per customer tier
   - Different retry schedules for different segments

4. **Customer Self-Service Waiver**
   - Customers can request fee waiver via email/dashboard
   - Auto-approve based on rules (e.g., first-time delinquency)
   - Escalate to ops for review if policy criteria not met

5. **Dunning Recovery Analytics**
   - Track which adjustments/waivers lead to successful payment
   - Measure ROI of fee waivers vs. recovery rate
   - Identify high-value customers for special handling

---

## Status

✅ **Complete**:
- Bill preview service and tRPC endpoint
- Admin bill adjustment and waiver mutations
- Delinquencies dashboard list and detail endpoints
- Event system for adjustments
- Ledger accounting for all operations

⏳ **Pending** (Phase 4+):
- Email notifications when fees waived, bills adjusted
- Admin UI for delinquencies dashboard
- Audit trail display in admin UI
- Customer self-service waiver requests
- Analytics dashboard

