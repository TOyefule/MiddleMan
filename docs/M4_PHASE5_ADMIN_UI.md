# M4 Phase 5: Admin Console UI for Dunning Management

**Status**: Complete  
**Timeline**: Admin dashboard and management UI for delinquencies  
**Deliverable**: Full-featured admin console with delinquencies list, detail views, and action forms

---

## Overview

Phase 5 implements the complete admin console UI for managing delinquent bills. Ops teams can now view delinquencies with rich context, take administrative actions (adjust charges, waive fees, escalate, retry), and track all changes with audit trails.

**Components**:
- **Delinquencies List**: Dashboard showing all past_due/uncollectible bills with enriched data
- **Delinquencies Detail**: Full bill view with dunning history and action buttons
- **Admin Action Modals**: Forms for adjust, waive fee, mark past due, clear uncollectible
- **Audit Trail**: Display of all actions with timestamps and reasons

---

## Delinquencies List Page

**Route**: `/delinquencies` (admin dashboard)

**File**: `apps/admin/src/app/(dash)/delinquencies/page.tsx`

### Features

✅ **Bill Summary Cards**
- Company name (from enriched Phase 3 API)
- Status badge (past_due in yellow, uncollectible in red)
- Remaining amount to collect
- Due date
- Days overdue (red text for urgency)
- Attempt count (number of dunning attempts)
- Late fee amount (if any)
- Last attempt timestamp
- Latest failure code (with error details)

✅ **Sorting & Organization**
- Sorted by due date (oldest first)
- Grouped visually by status
- Hover effect indicates clickable row

✅ **Quick Navigation**
- Click any bill card to open detail view
- "View Details" button with arrow indicator
- Breadcrumb context ("Delinquencies" > details)

✅ **Dashboard Stats**
- Total delinquent bill count shown in header
- Empty state when no delinquencies

### Data Returned by Phase 3 API

```typescript
admin.delinquencies.list() returns:
{
  billId: string;
  userId: string;
  companyName: string;        // From user table
  totalCents: number;
  paidCents: number;
  remainingCents: number;     // Calculated
  lateFeeCents: number;
  status: 'past_due' | 'uncollectible';
  dueDate: Date;
  daysOverdue: number;        // Calculated
  attemptCount: number;       // From dunningAttempts table
  lastAttemptAt?: Date;       // Most recent attempt
  failureCode?: string;       // Latest failure code
}[]
```

### Example List Page

```
Delinquencies                                          3 delinquent bills

Bills past due or uncollectible. Manual ops review at day 14+.

┌─────────────────────────────────────────────────────────────────┐
│ Acme Corp                                              past_due  │
│ Due Jun 4, 2026                                     $23.47 remaining
│
│ Days Overdue: 7    Attempts: 3    Late Fee: $15.00    Last: Jun 5
│ Latest error: charge_declined — Card was declined by payment processor
│
│                                              [View Details →]
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ TechStart Inc                                     uncollectible  │
│ Due May 30, 2026                                   $150.00 remaining
│
│ Days Overdue: 14   Attempts: 5    Late Fee: $15.00    Last: Jun 3
│ Latest error: account_closed — Card account was closed
│
│                                              [View Details →]
└─────────────────────────────────────────────────────────────────┘
```

---

## Delinquencies Detail Page

**Route**: `/delinquencies/[billId]` (dynamic route)

**File**: `apps/admin/src/app/(dash)/delinquencies/[billId]/page.tsx`

### Sections

#### 1. Header
- Company name (large)
- Customer email
- "Back to delinquencies" button

#### 2. Bill Status Card
- Bill ID (for reference/logs)
- Status badge (color-coded)
- Period start/end dates
- Due date
- Days overdue (prominently red)

#### 3. Amounts Card
- Total bill
- Amount paid (in green)
- Remaining amount (in red)
- Late fee (if any, in orange)

#### 4. Line Items Card
- All charges on the bill
- Subscription charges
- Adjustment line items (from Phase 3)
- Fee waivers (shown as negative)
- Each with amount

#### 5. Dunning History Card
- Attempt # (1, 2, 3, etc.)
- Method (smart_retry, fallback, ops_review)
- Status (scheduled, attempted, succeeded, failed)
- Timestamp of attempt
- Failure code and message (if failed)
- Next retry timestamp (if scheduled)
- Color-coded border by status

Example History Entry:
```
┌─────────────────────────────────────────────────────────────┐
│ Attempt #3                                            failed │
│ SMART_RETRY                                                  │
│
│ Jun 3, 2026 at 2:15 PM                                       │
│
│ Error: charge_declined — Card was declined by the issuer.    │
│ Next retry: Jun 5, 2026 at 2:15 PM                           │
└─────────────────────────────────────────────────────────────┘
```

#### 6. Admin Actions Card
- **Adjust Bill**: Add or subtract amount (+ charge, - credit)
- **Waive Fee** (if lateFeeCents > 0): Remove late fee
- **Mark Past Due** (if not already): Manual escalation
- **Clear & Retry** (if uncollectible): Reset status for retry

### User Interaction Flow

**Scenario 1: Adjust Bill**
```
1. Click "Adjust Bill" button
2. Modal opens with:
   - Amount input (decimal, +/- supported)
   - Reason textarea
   - Real-time validation (shows charge vs credit)
3. User enters $10.00 and "Overage for extra seat"
4. Click "Adjust Bill" button
5. API call: admin.bills.adjust({billId, amountCents: 1000, reason})
6. Success: Modal closes, detail page refreshes
7. Phase 4 notification sent: "Your bill has been adjusted: +$10.00"
```

**Scenario 2: Waive Fee**
```
1. Late fee = $15.00, button is clickable
2. Click "Waive Fee" button
3. Modal opens showing:
   - Fee amount to waive ($15.00 in green box)
   - Reason textarea
4. User enters reason: "First-time delinquency, approved waiver"
5. Click "Waive Fee" button
6. API call: admin.bills.waiveFee({billId, reason})
7. Success: Modal closes, detail page refreshes
8. Phase 4 notification sent: "Great news! Late fee waived ($15.00)"
```

**Scenario 3: Clear Uncollectible & Retry**
```
1. Bill status = uncollectible
2. Click "Clear & Retry" button
3. Modal opens with warning:
   - "This will reset status to pending_collection"
   - "Payment retry will be triggered within 24h"
   - Reason textarea
4. User enters: "Customer called, verified payment method is updated"
5. Click "Clear & Retry" button
6. API call: admin.bills.clearUncollectible({billId, reason})
7. Status changes to pending_collection
8. Payment retry flow is triggered by Inngest
9. Phase 4 notification sent: "We're retrying your bill payment"
```

---

## Action Modals

### Adjust Bill Modal

**File**: `components/adjust-bill-modal.tsx`

**Features**:
- Amount input with step=0.01 for cents precision
- Real-time validation (shows "Charge", "Credit", or "No change")
- Reason textarea (required, max 500 chars)
- Cancel and Submit buttons
- Loading state during submission
- Error handling with user-friendly messages

**Submission**:
- Converts decimal amount to cents: `parseFloat(amount) * 100`
- Calls `admin.bills.adjust` tRPC mutation
- On success, closes modal and refreshes parent page

### Waive Fee Modal

**File**: `components/waive-fee-modal.tsx`

**Features**:
- Shows fee amount to waive in green highlight box
- Reason textarea (required, max 500 chars)
- Helpful placeholder: "First-time delinquency, system error, customer retention"
- Cancel and Submit buttons
- Loading state during submission

**Submission**:
- Calls `admin.bills.waiveFee` tRPC mutation
- Returns `{success, waiverAmount, credited}`
- If success=false (no fee to waive), shows error
- On success, closes modal and refreshes parent page

### Mark Past Due Modal

**File**: `components/mark-past-due-modal.tsx`

**Features**:
- Yellow info box explaining the action:
  - "This will manually escalate the bill to past due status"
  - "Customer will receive a payment reminder"
- Reason textarea (required, max 500 chars)
- Helpful placeholder: "Manual escalation per policy, customer contacted"
- Cancel and Submit buttons

**Submission**:
- Calls `admin.bills.markPastDue` tRPC mutation
- Returns `{success: true}`
- On success, closes modal and refreshes parent page
- Phase 4 notification sent (if configured)

### Clear Uncollectible Modal

**File**: `components/clear-uncollectible-modal.tsx`

**Features**:
- Blue info box explaining the action:
  - "This will reset bill status to pending_collection"
  - "Payment retry will be triggered"
  - "Customer will receive a notification"
- Reason textarea (required, max 500 chars)
- Helpful placeholder: "Customer verified payment method is updated, spoke with customer and they're ready to pay"
- Cancel and Submit buttons

**Submission**:
- Calls `admin.bills.clearUncollectible` tRPC mutation
- Returns `{success: true}`
- On success, closes modal and refreshes parent page
- Phase 4 notification sent
- Payment retry flow triggered automatically

---

## Integration with Phase 3 APIs

### Phase 3 Endpoints Used

**List Page**:
```typescript
admin.delinquencies.list()
  // Returns enriched bills with company name, days overdue, attempt count
```

**Detail Page**:
```typescript
admin.delinquencies.get({ billId })
  // Returns { bill, user, preview, dunningHistory }
```

**Action Mutations**:
```typescript
admin.bills.adjust({ billId, amountCents, reason })
admin.bills.waiveFee({ billId, reason })
admin.bills.markPastDue({ billId, reason })
admin.bills.clearUncollectible({ billId, reason })
```

### Integration with Phase 4 Notifications

**Automatic Notification Dispatch**:
- When admin.bills.adjust is called → bill.adjusted event emitted
- When admin.bills.waiveFee is called → bill.fee_waived event emitted
- When admin.bills.markPastDue is called → bill.marked_past_due event emitted
- When admin.bills.clearUncollectible is called → bill.uncollectible_cleared event emitted

**Inngest Jobs Listen**:
- billAdjustedNotification listens to bill.adjusted
- billFeeWaivedNotification listens to bill.fee_waived
- billMarkedPastDueNotification listens to bill.marked_past_due
- billUncollectibleClearedNotification listens to bill.uncollectible_cleared

**Customer Receives Email**:
- "Your bill has been adjusted: +$X.XX" (for charges)
- "Credit applied to your bill: $X.XX" (for credits)
- "Great news: late fee waived ($X.XX)"
- "Action needed: Bill past due"
- "We're retrying your bill payment"

**No Manual Notification Needed**: Phase 5 UI automatically triggers Phase 4 notifications through events.

---

## Audit Trail / Logging

### Admin Action Logging

Each admin mutation logs with [Admin] prefix:
```
[Admin] admin-id adjusted bill 123abc by $10.00: Overage charge
[Admin] admin-id waived $15.00 late fee on bill 123abc: First-time delinquency
[Admin] admin-id marked bill 123abc as past due: Manual escalation per policy
[Admin] admin-id cleared uncollectible status on bill 123abc: Customer called
```

### Events Logged

Each action emits an event (captured in Phase 4):
```
bill.adjusted → { billId, amountCents, reason }
bill.fee_waived → { billId, waiverAmount, reason }
bill.marked_past_due → { billId, reason }
bill.uncollectible_cleared → { billId, reason }
```

### Double-Entry Ledger

Each action creates ledger entries (Phase 3):
```
Adjustment (charge): Dr. asset_receivable, Cr. revenue_adjustment
Adjustment (credit): Dr. revenue_adjustment, Cr. asset_receivable
Fee waiver: Dr. revenue_late, Cr. asset_receivable
```

### Future Enhancement: Audit Trail UI

Phase 6+ will add:
- Dedicated audit log page showing all admin actions
- Filters by action type, date range, admin
- Link to customer notifications sent for each action
- Admin names (not just IDs)
- User-friendly descriptions of actions

---

## File Structure

```
apps/admin/src/app/(dash)/delinquencies/
├── page.tsx                           # List page (enhanced)
├── [billId]/
│   └── page.tsx                       # Detail page (new)
└── components/
    ├── adjust-bill-modal.tsx          # Adjust bill form
    ├── waive-fee-modal.tsx            # Waive fee form
    ├── mark-past-due-modal.tsx        # Mark past due form
    └── clear-uncollectible-modal.tsx  # Clear uncollectible form
```

---

## UI Components Used

- **Card**: For sections and modal containers
- **Badge**: For status (past_due, uncollectible, succeeded, failed)
- **Button**: For actions and navigation
- **Input**: For amount input (adjust bill)
- **Textarea**: For reason input on all modals
- **Label**: Form labels
- **Skeleton**: Loading state for detail page
- **formatCents()**: Format amounts as currency
- **formatDate()**: Format dates consistently

---

## Error Handling

### Form Validation
- Amount input: Must be valid decimal, converted to cents
- Reason textarea: Required, max 500 characters
- Shows user-friendly error messages

### API Error Handling
- Catches tRPC mutation errors
- Displays error message in modal
- Prevents submit button spam (disabled while loading)

### Graceful Degradation
- If bill not found: Show "not found" message with back button
- If API fails: Show error in modal, user can retry
- Loading states prevent double-submission

---

## Success Metrics

- **Page load time**: <500ms for list, <800ms for detail
- **Action latency**: <100ms from submit to mutation call
- **Error recovery**: Users can retry failed actions
- **Mobile responsive**: Works on tablets (480px+)
- **Accessibility**: Proper labels, semantic HTML, ARIA where needed

---

## Testing Checklist

### List Page
- [ ] Load page, see delinquent bills (if any)
- [ ] Click bill card, navigates to detail page
- [ ] Bill count displayed in header
- [ ] Empty state shows when no bills
- [ ] Days overdue, attempts, late fees display correctly

### Detail Page
- [ ] Load with billId, shows full bill detail
- [ ] Line items displayed with amounts
- [ ] Dunning history shown in reverse order (newest first)
- [ ] Back button returns to list page
- [ ] Action buttons conditionally visible:
  - "Adjust Bill" always visible
  - "Waive Fee" only if lateFeeCents > 0
  - "Mark Past Due" only if status != uncollectible
  - "Clear & Retry" only if status == uncollectible

### Adjust Bill Action
- [ ] Click "Adjust Bill", modal opens
- [ ] Enter positive amount (e.g., 10.00), shows "Charge"
- [ ] Enter negative amount (e.g., -5.00), shows "Credit"
- [ ] Enter reason
- [ ] Click submit
- [ ] API call succeeds
- [ ] Modal closes, detail page refreshes
- [ ] Bill total updated
- [ ] Line item added for adjustment
- [ ] Customer receives email notification

### Waive Fee Action
- [ ] Click "Waive Fee" (only visible if fee > 0), modal opens
- [ ] Shows fee amount in green box
- [ ] Enter reason
- [ ] Click submit
- [ ] API call succeeds
- [ ] Modal closes, detail page refreshes
- [ ] Late fee removed
- [ ] Bill total decreased
- [ ] Customer receives email notification

### Mark Past Due Action
- [ ] Click "Mark Past Due", modal opens
- [ ] Shows warning about customer notification
- [ ] Enter reason
- [ ] Click submit
- [ ] API call succeeds
- [ ] Status badge changes to "past_due"
- [ ] Customer receives email notification

### Clear Uncollectible Action
- [ ] Bill status = uncollectible
- [ ] Click "Clear & Retry", modal opens
- [ ] Shows warning about retry and customer notification
- [ ] Enter reason
- [ ] Click submit
- [ ] API call succeeds
- [ ] Status badge changes to "pending_collection"
- [ ] Customer receives email notification
- [ ] Retry flow triggered (can check with new dunning attempt)

---

## Files Changed in Phase 5

| File | Action | Type | Lines |
|------|--------|------|-------|
| `delinquencies/page.tsx` | Enhance | Page | 110 |
| `delinquencies/[billId]/page.tsx` | Create | Page | 215 |
| `components/adjust-bill-modal.tsx` | Create | Component | 65 |
| `components/waive-fee-modal.tsx` | Create | Component | 60 |
| `components/mark-past-due-modal.tsx` | Create | Component | 65 |
| `components/clear-uncollectible-modal.tsx` | Create | Component | 70 |
| `M4_PHASE5_ADMIN_UI.md` | Create | Docs | 600+ |

**Total**: 7 files, ~1,185 insertions

---

## Status

✅ **Complete**:
- Delinquencies list page with enriched data
- Delinquencies detail page with full bill view
- Dunning history display
- 4 admin action modals (adjust, waive, mark past due, clear uncollectible)
- Form validation and error handling
- Integration with Phase 3 tRPC APIs
- Automatic Phase 4 notifications on actions
- Responsive design

⏳ **Pending** (Phase 6+):
- Audit trail UI showing all admin actions
- Admin search/filter on list page
- Bulk operations (waive fees for multiple bills)
- Customer notification history linked to actions
- Analytics on waiver success rates vs recovery

---

## Next Steps

### Phase 6: User-Facing Billing UI
- User bill list page
- User bill detail page
- Payment method management
- Historical bills archive

### Phase 7+: Analytics & Reporting
- Admin analytics dashboard
- Dunning recovery metrics
- Waiver ROI analysis
- Customer segment analysis

---

## Integration Summary

**Phase 1 → 2 → 3 → 4 → 5 Complete Flow**:
```
User fails payment (Phase 1)
  ↓
Dunning retries scheduled (Phase 2)
  ↓
Admin sees bill in delinquencies (Phase 5 UI)
  ↓
Admin waives fee (Phase 5 UI → Phase 3 API)
  ↓
Customer gets email notification (Phase 4)
  ↓
Admin clears uncollectible status (Phase 5 UI → Phase 3 API)
  ↓
Payment retry triggered (Phase 2)
  ↓
Payment succeeds (Phase 1)
  ↓
Bill marked paid automatically
```

All integrated, end-to-end.

