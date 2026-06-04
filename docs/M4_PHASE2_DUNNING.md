# M4 Phase 2: Dunning State Machine

**Status**: Complete  
**Timeline**: Completes Phase 1 integration  
**Deliverable**: Automated payment retry logic with late fees and ops escalation

---

## Overview

The dunning state machine handles failed payment recovery through an automated 5-attempt retry strategy with escalation to manual ops review.

**Flow**:
```
Bill Issued
    ↓
[Payment Collection (Phase 1)]
    ↓
Payment Failed → bill.payment.failed event
    ↓
[Dunning State Machine (Phase 2)]
    ├─ Attempt 1-3: Record smart retry, schedule next
    ├─ Attempt 3+: Assess $15 late fee
    ├─ Attempt 4: Try fallback payment method
    ├─ Attempt 5: Escalate to ops for manual review
    └─ Max: 5 attempts, then uncollectible
```

---

## Retry Strategy

### Backoff Timing (Conservative)

| Attempt | Delay | Total Time | Status |
|---------|-------|-----------|--------|
| 1st failure | — | T+0 | Recorded |
| 2nd attempt | 12h | T+12h | scheduled |
| 3rd attempt | 24h | T+36h | scheduled |
| 4th attempt (fallback) | 48h | T+84h | scheduled |
| 5th attempt | — | T+84h | escalated |

**Rationale**:
- Conservative delays reduce customer friction
- 3.5+ days total gives sufficient recovery window
- Users have time to update payment methods
- Fallback method at attempt 4 provides second chance

---

## Dunning Service (`packages/api/src/services/dunning.ts`)

### Functions

#### `assessLateFee(billId: string): Promise<boolean>`
- Assesses $15 late fee on first failure after attempt 3
- Idempotent: returns false if already assessed
- Updates bill total, creates line item, writes double-entry ledger
- Emits `bill.late_fee_assessed` event

**Ledger Flow**:
```
Dr. asset_receivable $15.00
Cr. revenue_late     $15.00
```

**When Called**:
- Automatically triggered on attempt 3, 4, 5
- Only assesses once per bill
- User notified via email

---

#### `getFallbackPaymentMethod(userId: string)`
- Retrieves user's secondary payment method
- Priority: explicitly marked `isFallback` → any non-primary → null
- Returns null if none exist or all deleted

**Usage**: Attempt 4 fallback retry

---

#### `attemptFallbackPayment(input: {billId, userId, amountCents}): Promise<string>`
- Creates Stripe PaymentIntent against fallback method
- Confirms immediately (ACH or card)
- Records attempt with `method='fallback'`
- Idempotency key: `bill-{billId}-fallback-{paymentMethodId}`
- Returns PaymentIntent ID or throws

**Error Handling**:
- If no fallback method exists → throws (caught by state machine)
- If PaymentIntent creation fails → thrown to state machine
- State machine logs and continues to escalation logic

---

#### `escalateToOps(billId: string): Promise<void>`
- Marks bill status as `uncollectible`
- Posts Slack notification to ops team with:
  - Bill amount and customer name
  - Days overdue and attempt count
  - Button link to admin console
- Emits `bill.escalated_to_ops` event
- Safe to call multiple times (idempotent on status update)

**Slack Message**:
```
:warning: Customer Delinquency Escalation
Company: Acme Corp
Bill: $150.00
Days Overdue: 7
Attempts: 5

Status: pending_collection | Due Date: 5/28/2026

[View in Admin Button]
```

---

#### `shouldEscalateToOps(billId: string): Promise<boolean>`
- Checks if bill meets escalation criteria:
  - ✅ 5+ payment attempts, OR
  - ✅ 7+ days overdue, OR
  - ✅ 2+ late fees (edge case)
- Used before escalation to prevent premature escalation

**Returns**: true if any criterion met, false otherwise

---

#### `isEscalated(bill: Bill): boolean`
- Utility: checks if bill is in `uncollectible` status
- Used in UI/queries to hide from customer-facing retry

---

## Dunning State Machine (`packages/jobs/src/functions/dunning.ts`)

### Trigger
```typescript
event: 'bill.payment.failed'
data: { billId, attemptNo, failureCode }
```

**Emitted by**: Payment collection service when Stripe PaymentIntent fails

---

### Execution Flow

#### Step 1: Log Attempt
- Logs attempt number and method type
- Informational only

#### Step 2: Attempt Fallback Payment (Attempt 4 only)
- Calls `dunningService.attemptFallbackPayment()`
- Creates PaymentIntent against secondary method
- If fallback fails → logs warning but continues (doesn't fail state machine)

#### Step 3: Assess Late Fee (Attempt 3+)
- Calls `dunningService.assessLateFee()`
- Returns true if newly assessed, false if already present
- Graceful on error: logs but doesn't fail

#### Step 4: Escalate to Ops (Attempt 5+)
- Checks `shouldEscalateToOps()` criteria
- If met → calls `escalateToOps()`
- Posts Slack, updates status, emits event
- Graceful on error (Slack failure doesn't break)

#### Step 5: Schedule Next Retry
- Calculates next retry time (12h/24h/48h based on attempt)
- Logs scheduled time
- **Future**: Cron job will wake at scheduled time and emit `bill.retry.requested`

---

## Events Emitted

### `bill.late_fee_assessed`
```typescript
data: { billId, lateFeeCents: 1500 }
```
**Listener**: Notifications service (Phase 4)

### `bill.escalated_to_ops`
```typescript
data: { billId, daysOverdue, attemptCount }
```
**Listener**: Admin notifications, analytics

---

## Database Changes

### bills table
- `status`: transitions `pending_collection` → `past_due` (after late fee) → `uncollectible` (after ops escalation)
- `lateFeeCents`: set to 1500 on first late fee assessment
- `totalCents`: incremented by late fee amount

### billLineItems table
- New row with `type='late_fee'` when assessed
- `description`: "Late fee — payment past due"
- `amountCents`: 1500

### dunningAttempts table
- New attempt recorded for each failed PaymentIntent
- Attempt 4 has `method='fallback'`
- Attempt 5 has `method='ops_review'`
- All filled in automatically by state machine

### ledgerEntries table
- Late fee: `Dr. asset_receivable $15.00, Cr. revenue_late $15.00`

---

## Configuration

### Environment Variables

```bash
# Required for ops escalation
SLACK_OPS_WEBHOOK_URL="https://hooks.slack.com/services/T.../B.../XX..."

# Optional: customize admin link in Slack message
ADMIN_URL="https://admin.middleman.dev"  # defaults to http://localhost:3001
```

### Constants (in `services/dunning.ts`)

```typescript
const LATE_FEE_CENTS = 1500;                              // $15.00
const LATE_FEE_ASSESSMENT_THRESHOLD_ATTEMPTS = 3;        // After 3rd attempt
const OPS_ESCALATION_THRESHOLD_ATTEMPTS = 5;              // After 5th attempt
const OPS_ESCALATION_DAYS_OVERDUE = 7;                   // OR 7+ days overdue
```

---

## Error Handling

All steps in the state machine are wrapped in `try/catch`:
- **Fallback payment**: Logs warning, continues to escalation logic
- **Late fee assessment**: Logs error, continues
- **Ops escalation**: Logs error, continues (even if Slack fails)
- **Schedule next retry**: Informational only

This design ensures one failing operation doesn't stop the entire state machine.

---

## Idempotency

### Late Fee Assessment
- Checks if `bill.lateFeeCents > 0` before assessing
- Safe to call multiple times per bill
- Only assessed once

### Ops Escalation
- Checks `bill.status = 'uncollectible'` before marking
- Safe to call multiple times
- Status update is idempotent (set to uncollectible)

### Fallback Payment
- Uses idempotency key: `bill-{billId}-fallback-{paymentMethodId}`
- Stripe prevents duplicate charges

---

## Testing

### Unit Tests (Recommended)
- `assessLateFee()`: verify ledger double-entry, status transitions
- `getFallbackPaymentMethod()`: test primary/secondary/deleted logic
- `shouldEscalateToOps()`: verify all escalation criteria

### Integration Tests (Recommended)
- Simulate `bill.payment.failed` event
- Verify dunning state machine runs
- Check late fee assessed at attempt 3
- Verify ops escalation on attempt 5
- Confirm Slack message posted (optional: mock webhook)

### Manual Testing
1. Create bill via cycle-close
2. Payment fails (use test card)
3. Check dunning_attempts table (should show attempt 1: failed)
4. Wait/simulate next retry
5. Verify bill status transitions and late fee applied

---

## Future Enhancements (M4+)

1. **Automatic Retry Scheduler**
   - Cron job that wakes at `dunningAttempts.nextRetryAt`
   - Emits `bill.retry.requested` for payment-retry-job
   - Currently logged but not auto-triggered

2. **Smart Retry via Stripe**
   - Stripe can handle retries directly
   - Integrate Stripe's smart retry scheduling
   - Reduces our polling overhead

3. **Dunning Analytics**
   - Track recovery rate by attempt
   - Calculate average days to recovery
   - Identify failure patterns by failure code

4. **Customizable Backoff**
   - Allow per-customer backoff strategies
   - Different tiers might have different retry windows
   - Admin UI to adjust

5. **Recovery Notifications**
   - Celebrate successful recovery emails
   - Ask customers what payment method worked best
   - Feedback loop for UX improvement

---

## Success Metrics

- **Late fee assessment**: 100% of bills at attempt 3
- **Fallback success rate**: >10% of attempt 4 succeed
- **Ops escalation**: <5% of bills reach uncollectible
- **Slack notification delivery**: 99%+ (monitor via Slack audit logs)
- **State machine latency**: <5 seconds per event (Inngest timeout: 30s)

---

## Status

✅ **Complete**:
- Dunning service with all helpers
- State machine orchestration
- Event emissions
- Environment variables

⏳ **Pending** (Phase 3+):
- Automatic retry scheduler (cron job)
- Notification templates (Phase 4)
- Admin UI for manual interventions (Phase 5)
- Analytics dashboard (Phase 5+)
