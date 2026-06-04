# M4 Phase 4: Notifications & Customer Communication

**Status**: Complete  
**Timeline**: Email/SMS notification system for Phase 3 events  
**Deliverable**: Automated customer communications for bill adjustments, fee waivers, and delinquency management

---

## Overview

Phase 4 implements automated customer notifications for all Phase 3 admin actions (bill adjustments, fee waivers, status changes). Customers receive timely, personalized emails and SMS alerts when their bills are modified, fees are waived, or payment status changes.

**Components**:
- **Email Templates**: Five new React Email templates for customer-facing notifications
- **Notification Jobs**: Inngest functions listening to Phase 3 events
- **Preferences System**: User control over notification channels and categories
- **Audit Trail**: All notifications logged with delivery status

---

## Email Templates

### 1. Bill Adjusted (Charge)

**File**: `packages/ui/src/emails/bill-adjusted-charge.tsx`

**Triggers**: `bill.adjusted` event with positive `amountCents`

**Subject**: `Your bill has been adjusted: +$X.XX`

**Content**:
- Explains the charge amount
- States the reason for adjustment
- Shows new bill total in highlight box
- Offers support contact info
- CTA: "View updated bill"

**Use Cases**:
- Overage charges (extra users, storage)
- Late payment fees (administrative)
- Service re-activation charges

**Example Data**:
```typescript
{
  userName: "Jane Doe",
  adjustmentAmount: "$10.00",
  reason: "Overage charge for extra users",
  newTotal: "$62.47",
  viewBillUrl: "https://middleman.app/bills"
}
```

---

### 2. Bill Adjusted (Credit)

**File**: `packages/ui/src/emails/bill-adjusted-credit.tsx`

**Triggers**: `bill.adjusted` event with negative `amountCents`

**Subject**: `Credit applied to your bill: $X.XX`

**Content**:
- Announces credit/refund amount
- States reason (goodwill, error correction, promotion)
- Shows new lower total in green highlight
- Thanks customer for patience/loyalty
- CTA: "View updated bill"

**Use Cases**:
- Goodwill credits for service issues
- Billing error corrections
- Promotional credits

**Example Data**:
```typescript
{
  userName: "Jane Doe",
  creditAmount: "$5.00",
  reason: "Courtesy credit for billing error",
  newTotal: "$47.47",
  viewBillUrl: "https://middleman.app/bills"
}
```

---

### 3. Fee Waived

**File**: `packages/ui/src/emails/fee-waived.tsx`

**Triggers**: `bill.fee_waived` event

**Subject**: `Great news: late fee waived ($X.XX)`

**Content**:
- Celebrates fee waiver with emoji
- Shows waived amount clearly
- States reason for waiver
- Shows new lower total in green
- Offers help with payment setup
- CTA: "View updated bill"

**Use Cases**:
- First-time delinquency forgiveness
- System error refunds
- Customer retention gestures

**Example Data**:
```typescript
{
  userName: "Jane Doe",
  waiverAmount: "$15.00",
  reason: "Waived due to system error",
  newTotal: "$47.47",
  viewBillUrl: "https://middleman.app/bills"
}
```

---

### 4. Bill Marked Past Due

**File**: `packages/ui/src/emails/bill-marked-past-due.tsx`

**Triggers**: `bill.marked_past_due` event

**Subject**: `Action needed: Bill past due`

**Content**:
- Red/warning tone with urgency
- States days overdue
- Explains what happened (e.g., "Payment attempt failed")
- Warning box about account escalation
- Offers to update payment method
- CTA: "Pay now" (red)

**Use Cases**:
- Manual ops escalation of delinquent bill
- First failure notification (with escalation warning)
- Recovery attempt trigger

**Example Data**:
```typescript
{
  userName: "Jane Doe",
  daysOverdue: 7,
  totalAmount: "$52.47",
  reason: "Payment attempt failed",
  viewBillUrl: "https://middleman.app/bills"
}
```

---

### 5. Uncollectible Status Cleared

**File**: `packages/ui/src/emails/uncollectible-cleared.tsx`

**Triggers**: `bill.uncollectible_cleared` event

**Subject**: `We're retrying your MiddleMan bill payment`

**Content**:
- Friendly, non-accusatory tone
- Explains status reset
- Instructions to verify payment method
- Timing: "next 24 hours"
- Blue info box with action items
- CTA: "Update payment method"

**Use Cases**:
- Ops clears uncollectible status for retry
- Allows customer to intervene before retry
- Sets customer expectation for retry attempt

**Example Data**:
```typescript
{
  userName: "Jane Doe",
  totalAmount: "$62.47",
  reason: "Status cleared for retry",
  viewBillUrl: "https://middleman.app/bills"
}
```

---

## Notification Service

**File**: `packages/api/src/services/notifications.ts` (Enhanced)

### New Templates

Added five new notification templates:
- `bill_adjusted_charge`: Charge notification
- `bill_adjusted_credit`: Credit notification
- `fee_waived`: Fee waiver notification
- `bill_marked_past_due`: Delinquency escalation
- `uncollectible_cleared`: Retry notification

### Template Categories

Each template maps to a category for user preferences:

| Template | Category | Opt-Out? |
|----------|----------|----------|
| bill_adjusted_charge | billing | Yes (default on) |
| bill_adjusted_credit | billing | Yes (default on) |
| fee_waived | billing | Yes (default on) |
| bill_marked_past_due | dunning | Yes (default on) |
| uncollectible_cleared | dunning | Yes (default on) |

Users can opt out of any category per channel (email/SMS).

### User Preferences

Users control notifications via the `notification_preferences` table:

```sql
SELECT * FROM notification_preferences
WHERE user_id = 'user-123'
  AND category IN ('billing', 'dunning');

-- Example results:
-- user_id | channel | category | enabled
-- user-123 | email | billing | true
-- user-123 | email | dunning | true
-- user-123 | sms | billing | false
-- user-123 | sms | dunning | true
```

### Dispatch Logic

When an event triggers a notification:

1. Read user and preferences from DB
2. Check which channels are enabled for this category
3. Send to enabled channels (email, SMS)
4. Log each attempt to `notifications` table with status

### Notification Logging

Every notification attempt is recorded:

```sql
SELECT * FROM notifications
WHERE user_id = 'user-123'
  AND template = 'bill_adjusted_charge';

-- Columns:
-- id | user_id | channel | template | payload | status | sent_at | external_id | failure_message
```

Status values:
- `queued`: Recorded, about to send
- `sent`: Delivered to provider (Resend/Twilio)
- `failed`: Provider error or invalid address

---

## Inngest Jobs

**File**: `packages/jobs/src/functions/bill-notifications.ts` (New)

### Job 1: Bill Adjusted Notification

**Function**: `billAdjustedNotification`

**Trigger**: `bill.adjusted` event

**Logic**:
1. Fetch bill and user from DB
2. Determine if charge or credit (amountCents > 0)
3. Format amounts and new total
4. Dispatch to notification service with appropriate template

**Concurrency**: 50 jobs per billId (prevents thundering herd)

**Logging**:
```
[Notifications] Sent bill_adjusted_charge for bill 123abc: $10.00 (Overage charge)
```

---

### Job 2: Fee Waived Notification

**Function**: `billFeeWaivedNotification`

**Trigger**: `bill.fee_waived` event

**Logic**:
1. Fetch bill and user
2. Format waiver amount and new total
3. Dispatch notification with waiver details

**Concurrency**: 50 jobs per billId

**Logging**:
```
[Notifications] Sent fee_waived for bill 123abc: $15.00
```

---

### Job 3: Bill Marked Past Due Notification

**Function**: `billMarkedPastDueNotification`

**Trigger**: `bill.marked_past_due` event

**Logic**:
1. Fetch bill and user
2. Calculate days overdue
3. Format amounts
4. Dispatch with urgency tone

**Concurrency**: 50 jobs per billId

**Logging**:
```
[Notifications] Sent bill_marked_past_due for bill 123abc: 7 days overdue
```

---

### Job 4: Uncollectible Cleared Notification

**Function**: `billUncollectibleClearedNotification`

**Trigger**: `bill.uncollectible_cleared` event

**Logic**:
1. Fetch bill and user
2. Format total amount
3. Dispatch with friendly, hopeful tone

**Concurrency**: 50 jobs per billId

**Logging**:
```
[Notifications] Sent uncollectible_cleared for bill 123abc
```

---

## Event Flow

### Flow 1: Admin Charges Customer

```
User: Admin clicks "Add charge" in delinquencies dashboard
  ↓
POST /api/trpc/admin.bills.adjust
  {billId: "123", amountCents: 1000, reason: "Overage"}
  ↓
bill-admin.adjustBill()
  - Validates bill not paid
  - Creates line item with type='adjustment'
  - Double-entry ledger entries
  - Emits bill.adjusted event
  ↓
bill.adjusted event in Inngest
  {billId: "123", amountCents: 1000, reason: "Overage"}
  ↓
billAdjustedNotification job
  - Fetches bill (sees new total)
  - Formats data
  - Calls notification.dispatch()
  ↓
User receives email:
  Subject: "Your bill has been adjusted: +$10.00"
  Body: Shows $10 charge, reason, new total, CTA
```

### Flow 2: Admin Waives Fee

```
User: Admin clicks "Waive late fee" in delinquencies dashboard
  ↓
POST /api/trpc/admin.bills.waiveFee
  {billId: "123", reason: "System error"}
  ↓
bill-admin.waiveFee()
  - Checks if lateFeeCents > 0
  - Creates negative line item
  - Double-entry ledger entries
  - Emits bill.fee_waived event
  ↓
bill.fee_waived event in Inngest
  {billId: "123", waiverAmount: 1500, reason: "System error"}
  ↓
billFeeWaivedNotification job
  - Fetches bill
  - Formats waiver amount
  - Calls notification.dispatch()
  ↓
User receives email:
  Subject: "Great news: late fee waived ($15.00)"
  Body: Celebrates waiver, shows new total, CTA
```

### Flow 3: Bill Escalated to Past Due

```
dunning-state-machine job triggers on payment failure
  ↓
Determines escalation needed (5+ attempts or 7+ days)
  ↓
bill-admin.markPastDue()
  - Sets status = 'past_due'
  - Emits bill.marked_past_due event
  ↓
billMarkedPastDueNotification job
  - Fetches bill
  - Calculates days overdue
  - Calls notification.dispatch()
  ↓
User receives email:
  Subject: "Action needed: Bill past due"
  Body: Red warning, days overdue, reason, CTA "Pay now"
```

### Flow 4: Ops Retries Uncollectible Bill

```
User: Ops clicks "Retry payment" in delinquencies dashboard
  ↓
POST /api/trpc/admin.bills.clearUncollectible
  {billId: "123", reason: "Customer called, verified payment method"}
  ↓
bill-admin.clearUncollectible()
  - Sets status = 'pending_collection'
  - Emits bill.uncollectible_cleared event
  ↓
billUncollectibleClearedNotification job
  - Fetches bill
  - Calls notification.dispatch()
  ↓
User receives email:
  Subject: "We're retrying your MiddleMan bill payment"
  Body: Friendly tone, verify payment method, retry in 24h
  ↓
paymentRetryJob wakes up at nextRetryAt
  - Attempts collection again
  - Emits success or failure event
```

---

## Configuration

### Environment Variables

No new environment variables required. Uses existing:
- `RESEND_API_KEY`: Email delivery
- `TWILIO_ACCOUNT_SID`: SMS delivery
- `TWILIO_AUTH_TOKEN`: SMS delivery
- `TWILIO_FROM_NUMBER`: SMS sender number

### Preference Defaults

Default notification preferences:

```typescript
function defaultEnabled(channel: string, category: string): boolean {
  // Security and billing default to opt-out (enabled=true)
  if (category === 'marketing') return false;
  if (channel === 'sms' && category === 'sub_activity') return false;
  return true;
}
```

Overrides:
- **Billing events** (bill_adjusted_*, fee_waived): Default ON for email, SMS
- **Dunning events** (bill_marked_past_due, uncollectible_cleared): Default ON for email, SMS
- SMS for non-critical updates: Default OFF (opt-in)

---

## Database Changes

### notifications table

Receives new rows for each dispatch attempt:

```sql
-- Example
INSERT INTO notifications (user_id, channel, template, payload, status, sent_at, external_id)
VALUES (
  'user-123',
  'email',
  'bill_adjusted_charge',
  '{"adjustmentAmount": "$10.00", "reason": "Overage", "newTotal": "$62.47"}',
  'sent',
  '2026-06-04T14:23:15Z',
  'resend-email-id-xyz'
);
```

No schema changes required. Uses existing `notifications` table.

---

## Error Handling

### Notification Failures

If Resend or Twilio fails:
1. Exception caught in `sendEmail()` / `sendSms()`
2. Status set to `failed` in `notifications` table
3. `failureMessage` logged for debugging
4. No retry (one-shot attempt)
5. Alert to ops via logs

### Missing User

If user deleted between event and job execution:
- Inngest job logs warning
- Gracefully returns without crashing
- No notification created

### Invalid Email/Phone

If user email missing or phone malformed:
- Resend/Twilio rejects with error
- Status set to `failed`
- Ops can review `notifications` table for delivery issues

---

## Testing

### Manual Tests

1. **Charge Notification**:
   - Create delinquent bill
   - Call `admin.bills.adjust({billId, amountCents: 1000, reason: "Test"})`
   - Check email inbox for charge notification
   - Verify subject, amount, reason, new total

2. **Fee Waiver Notification**:
   - Create bill with late fee
   - Call `admin.bills.waiveFee({billId, reason: "Test"})`
   - Check email inbox for waiver notification
   - Verify celebratory tone, amount, new total

3. **Past Due Notification**:
   - Create bill marked past_due
   - Call `admin.bills.markPastDue({billId, reason: "Test"})`
   - Check email inbox for urgency warning
   - Verify red CTA, days overdue

4. **Uncollectible Cleared Notification**:
   - Create bill in uncollectible status
   - Call `admin.bills.clearUncollectible({billId, reason: "Test"})`
   - Check email inbox for retry notification
   - Verify friendly tone, payment method reminder

5. **Preferences Test**:
   - Disable email for billing category
   - Perform adjustment → no email sent
   - Re-enable email for billing category
   - Perform adjustment → email sent

### Integration Tests

- Phase 1 → Phase 3 → Phase 4: Payment collection fails → late fee assessed → adjustment notification
- Admin adjusts bill → customer receives email → admin notes satisfaction in delinquencies list
- Fee waived → customer gets celebratory email → payment attempt succeeds shortly after

---

## Success Metrics

- **Delivery rate**: >95% of notifications sent successfully
- **Email latency**: <5s from event to Resend API
- **SMS latency**: <5s from event to Twilio API
- **Job concurrency**: 50 jobs per billId prevents overload
- **Preference compliance**: 100% of disabled preferences respected
- **Error recovery**: <1% silent failures (logged as `failed` status)

---

## Notification Delivery Examples

### Example 1: Charge Notification

**Email received**:

```
From: MiddleMan <hello@middleman.app>
Subject: Your bill has been adjusted: +$10.00

Hello Jane Doe,

We've added a charge of $10.00 to your MiddleMan bill.

Reason: Overage charge for extra users

┌─────────────────────────────┐
│ Your new bill total: $62.47 │
└─────────────────────────────┘

If you have questions about this adjustment, please reach out to our support team.

[VIEW UPDATED BILL]

---
MiddleMan Inc. — One bill, all your subscriptions.
```

### Example 2: Fee Waived Notification

**Email received**:

```
From: MiddleMan <hello@middleman.app>
Subject: Great news: late fee waived ($15.00)

Hello Jane Doe,

We're waiving the late fee of $15.00 on your MiddleMan bill. 🎉

Why: Waived due to system error

┌─────────────────────────────┐
│ Your new bill total: $47.47 │
└─────────────────────────────┘

We appreciate your business, and we want to make this right. If you need any help
getting your payment set up, please don't hesitate to reach out.

[VIEW UPDATED BILL]

---
MiddleMan Inc. — One bill, all your subscriptions.
```

---

## Future Enhancements (M4+)

1. **HTML Email Rendering**
   - Currently: Plain text fallback + Resend's HTML composition
   - Future: React Email renders to HTML via `react-email` package
   - Use `renderAsync()` from React Email for rich templating

2. **SMS Notification Customization**
   - Currently: Plain text only from `textFor()` function
   - Future: Custom SMS templates with shorter, mobile-friendly text
   - Example: "MiddleMan: Your $62 bill is past due. Update payment: [link]"

3. **Notification Digest**
   - Batch multiple events in one email (e.g., week of adjustments)
   - Daily/weekly digest of account activity
   - Reduces notification fatigue for heavy users

4. **Webhook Notifications**
   - Send notifications to customer's Slack/Teams channel
   - Integrate with customer's incident management system
   - Custom webhook templates per customer

5. **Notification Analytics**
   - Track open rates, click rates on email CTAs
   - Measure which notifications drive payments
   - A/B test email subject lines and content

6. **Escalation Notifications**
   - Send to different email when escalated to collections
   - Notifyops team when bill hits uncollectible
   - Auto-escalate to legal department after X days

7. **Customer Preference Portal**
   - Add UI in customer dashboard to manage notification preferences
   - Real-time opt-in/opt-out (not just admin)
   - Notification history and transcript

---

## Status

✅ **Complete**:
- Five email templates (React Email)
- Four Inngest notification jobs
- Template categories and preference system
- Plain-text email fallbacks
- Event → notification dispatch pipeline
- Notification logging and audit trail

⏳ **Pending** (Phase 5+):
- Admin UI for delinquencies dashboard
- HTML rendering of React Email templates
- SMS notification customization
- Customer notification preference portal
- Notification analytics dashboard
- Escalation notifications

---

## Files Changed in Phase 4

| File | Action | Lines |
|------|--------|-------|
| `packages/ui/src/emails/bill-adjusted-charge.tsx` | Create | 66 |
| `packages/ui/src/emails/bill-adjusted-credit.tsx` | Create | 69 |
| `packages/ui/src/emails/fee-waived.tsx` | Create | 71 |
| `packages/ui/src/emails/bill-marked-past-due.tsx` | Create | 74 |
| `packages/ui/src/emails/uncollectible-cleared.tsx` | Create | 70 |
| `packages/api/src/services/notifications.ts` | Update | +70 |
| `packages/jobs/src/functions/bill-notifications.ts` | Create | 190 |
| `packages/jobs/src/index.ts` | Update | +4 |
| `docs/M4_PHASE4_NOTIFICATIONS.md` | Create | 700+ |

**Total**: 8 files changed, ~1,314 insertions

