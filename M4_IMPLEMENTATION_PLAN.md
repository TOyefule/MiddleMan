# M4: Billing Engine & Dunning — 6-Phase Implementation Plan

**Timeline:** 3-4 weeks  
**Scope:** Complete payment collection pipeline, dunning state machine, admin console, and customer UI  
**Owner:** Engineering + Product  

---

## Phase 1: Payment Collection Engine (ACH + Card Fallback)

Implement Stripe Payment Intent workflow for ACH debit with fallback to virtual card authorization.

### Goals
- Create PaymentIntent for ACH pulls on primary payment method
- Implement fallback to secondary method or virtual card auth
- Wire webhook handlers for success/failure events
- Design smart retry scheduling with exponential backoff

### Key Files
- `packages/api/src/services/payment-collection.ts` (NEW)
- `packages/jobs/src/functions/payment-collection.ts` (NEW)
- `packages/api/src/routers/bills.ts` (UPDATE: add `retry` endpoint)
- `apps/web/src/app/api/webhooks/stripe-billing/route.ts` (UPDATE: webhook handlers)

### tRPC Endpoints
- `bills.retry({ billId })` — Manual retry of failed bill
- `bills.getPaymentStatus({ billId })` — Check PaymentIntent status

### Inngest Functions
1. `payment-collection-job` — Triggered by `bill.issued`
   - Step 1: Fetch bill + user's primary payment method
   - Step 2: Create Stripe PaymentIntent (ACH debit)
   - Step 3: Schedule webhook receipt timeout (30s)
   - Step 4: On timeout or failure, emit `payment.failed` → dunning state machine

2. `payment-retry-job` — Triggered by `bill.retry` mutation or dunning escalation
   - Step 1: Validate bill unpaid + not too many retries
   - Step 2: Create new PaymentIntent (smart backoff: 12h → 24h → 48h)
   - Step 3: Update dunning_attempts with scheduled nextRetryAt

### Database Operations
- Query paymentMethods (primary + fallback)
- Insert/update dunningAttempts with Stripe PaymentIntent IDs
- Track payment state: `bills.status` transitions: open → pending_collection → paid/past_due

### Stripe Integration
```
payment_intent.payment_failed:
  → Record failure code in dunningAttempts
  → Emit bill.payment.failed event
  
payment_intent.succeeded:
  → Mark bill.status = 'paid', set bill.paidAt
  → Write ledger: asset_receivable → asset_cash
  → Emit bill.payment.succeeded (for notifications)
```

### Success Criteria
- PaymentIntent created within 10s of bill.issued
- Webhook handlers parse all Stripe failure codes (insufficient_funds, card_declined, etc.)
- Dunning state machine triggered on payment failure
- Manual retry endpoint works end-to-end (create PI → await webhook)

---

## Phase 2: Dunning State Machine Completion

Complete TODOs in `dunning.ts`. Build 3-attempt smart retry logic with late fee + ops escalation.

### Goals
- Complete fallback payment intent creation (attempt 4)
- Implement 3-attempt smart retry schedule
- Add late fee assessment (day 3+)
- Ops escalation + Slack notification (day 5+)

### Key Files
- `packages/jobs/src/functions/dunning.ts` (UPDATE: fill TODO sections)
- `packages/api/src/services/dunning.ts` (NEW: helper functions)

### Inngest State Machine
```
bill.payment.failed event:
  → attemptNo 1-3: Record in dunningAttempts.method='smart_retry'
                   Schedule next attempt via smart backoff (12h → 24h → 48h)
  → attemptNo 4:   Create fallback PaymentIntent against secondary method
                   OR trigger virtual card auth ($50 minimum fallback)
  → attemptNo >= 3: Assess $15 late fee (once per bill)
                    Email: "Your payment failed, late fee applied"
  → attemptNo >= 5: Escalate to ops
                    Slack: "@billing-ops: [company_name] past due by 7+ days"
                    Mark bill.status='uncollectible'
```

### Late Fee Logic
- First failure at day 0 → assess late fee at day 3
- Once assessed, idempotent: don't double-charge
- Create new billLineItem type='late_fee' + update bill.totalCents

### Ops Escalation Criteria
1. 5+ failed attempts
2. OR 7+ days past due
3. OR 2+ late fees assessed

Slack payload:
```json
{
  "text": ":warning: Customer Delinquency Escalation",
  "blocks": [
    { "type": "section", "text": { "type": "mrkdwn", "text": "*Company:* ...\n*Bill:* $XXX.XX\n*Days Overdue:* 7\n*Attempts:* 5" } },
    { "type": "section", "text": { "type": "mrkdwn", "text": "_Latest failure: insufficient_funds (3h ago)_" } },
    { "type": "actions", "elements": [ { "type": "button", "text": { "type": "plain_text", "text": "View in Admin" }, "url": "..." } ] }
  ]
}
```

### Success Criteria
- All dunning.ts TODOs completed
- Smart retry backoff tested: 3h → 12h → 24h
- Late fee + ops escalation triggered correctly
- Slack notifications sent to ops channel

---

## Phase 3: Bill Preview & Lifecycle

Implement bill preview endpoint and manual adjustment flows for admins.

### Goals
- Live preview of current cycle charges + SaaS fee
- Manual retry endpoint with idempotency
- Admin overrides for late fees & adjustments
- Bill status transition audit trail

### Key Files
- `packages/api/src/services/billing.ts` (UPDATE: add previewCurrentCycle, applyAdjustment)
- `packages/api/src/routers/bills.ts` (UPDATE: add preview, adjustments, retry endpoints)
- `packages/api/src/routers/admin/delinquencies.ts` (UPDATE: add adjustment flow)

### tRPC Endpoints (User)
```typescript
bills.preview() → {
  userId, billingDay, saasTier,
  charges: [{ date, amount, description }],
  saasFeeCents, overageFeeCents,
  projectedTotalCents, currentPeriodSpentCents
}

bills.retry({ billId }) → { ok: true }
```

### tRPC Endpoints (Admin)
```typescript
admin.delinquencies.list({ status?: 'open' | 'past_due' | 'uncollectible' }) → [...]

admin.delinquencies.adjustBill({
  billId, adjustmentCents, reason, createdBy
}) → { bill: Bill, ledgerEntryId: string }

admin.delinquencies.waiveFee({
  billId, feeType: 'late_fee' | 'all'
}) → { bill: Bill }

admin.delinquencies.retryNow({
  billId, paymentMethodId?: string
}) → { paymentIntentId: string }
```

### Database Operations
- Query charges in current period (not yet billed)
- Insert billLineItems for adjustments (type='adjustment')
- Write ledger: adjustments flow via asset_receivable/revenue adjustment accounts
- Audit: record admin action in a new admAuditLog table (who, what, when)

### Preview Logic
```typescript
export async function previewCurrentCycle(userId: string) {
  const db = getDb();
  const user = await getUser(userId);
  
  // Period: billingDay of last month → billingDay today
  const periodStart = lastBillingDate(user.billingDay);
  const periodEnd = new Date();
  
  // Get unbilled charges
  const charges = await db.select().from(schema.charges)
    .where(and(
      eq(schema.charges.userId, userId),
      eq(schema.charges.status, 'captured'),
      gte(schema.charges.occurredAt, periodStart),
      lte(schema.charges.occurredAt, periodEnd)
    ));
  
  const passthroughCents = charges.reduce((s, c) => s + c.amountCents, 0);
  
  // Count active subs today (projected tier)
  const activeSubCount = await countActiveSubs(userId);
  const { tier, saasFeeCents, overageFeeCents } = computeTier(activeSubCount);
  
  return {
    userId,
    billingDay: user.billingDay,
    saasTier: tier,
    charges,
    passthroughCents,
    saasFeeCents,
    overageFeeCents,
    projectedTotalCents: passthroughCents + saasFeeCents + overageFeeCents,
    currentPeriodSpentCents: user.currentPeriodSpentCents
  };
}
```

### Success Criteria
- Preview endpoint matches finalized bill (within 1 cent)
- Adjustments flow correctly through ledger
- Admin can waive late fees without breaking double-entry invariant
- Retry endpoint creates new PaymentIntent immediately

---

## Phase 4: Notifications & Customer Communication

Build email, SMS, and in-app notification templates for all bill lifecycle events.

### Goals
- Email: bill issued, payment due, payment failed, payment succeeded, late fee applied
- SMS: overdue alerts (optional; gate behind user preference)
- In-app: notifications via websocket (real-time) or polling
- Slack: ops team alerts for escalations

### Key Files
- `packages/api/src/services/notifications.ts` (UPDATE: add bill notification functions)
- `packages/jobs/src/functions/notifications.ts` (NEW)
- `apps/web/src/components/notification-center.tsx` (NEW)
- Email templates (NEW): `packages/email/templates/billing/`

### Inngest Functions
```
bill.issued → send-bill-email
  Template: "Your MiddleMan bill for ${month}"
  Include: total, line items, due date, payment method, portal link

payment.failed → send-payment-failure-email (first 3 attempts)
              → send-late-fee-email (attempt >= 3)
  Template: "Payment failed: ${failureCode}"
  Include: failure reason, retry date, fallback method info

payment.succeeded → send-payment-success-email
  Template: "Payment received — Thank you!"
  Include: amount, date, receipt link

bill.past_due → send-overdue-sms (if enabled)
              → send-overdue-email
  Template: "Your bill is ${daysOverdue} days overdue"
  Include: amount due, payment link, support contact
```

### In-App Notifications
- Notification model: `schema.notifications` (type, userId, billId, read, createdAt)
- WebSocket: emit notification on bill state change
- Fallback: polling endpoint `notifications.list({ limit: 20, unreadOnly: true })`
- Mark read: `notifications.markAsRead({ notificationId })`

### Email Transport
- Use existing Inngest step: `await step.sendEvent('send-email', ...)`
- Delegate to postmark/SendGrid via dedicated Inngest function
- Track opens/clicks for analytics

### SMS Transport (Optional)
- Gate behind user.preferSms flag
- Use Twilio: max 3 SMS per bill lifecycle (issued, overdue warning, past due)
- Respect quiet hours (7pm-7am)

### Success Criteria
- Email sent within 2 min of bill.issued
- All email templates pass spam filters (SPF/DKIM)
- In-app notifications sync within 5 seconds of state change
- Ops Slack notifications include actionable links

---

## Phase 5: Admin Console for Dunning

Build delinquencies dashboard with retry & override flows.

### Goals
- Dashboard: list delinquent bills with status, days overdue, retry history
- Dunning log: view all attempts with failure codes & timestamps
- Manual retry: trigger payment collection with optional method override
- Late fee override: waive, adjust, or reapply fees
- Bulk operations: retry N bills at once

### Key Files
- `apps/admin/src/app/(dash)/delinquencies/page.tsx` (NEW)
- `apps/admin/src/app/(dash)/delinquencies/[billId]/page.tsx` (NEW)
- `packages/api/src/routers/admin/delinquencies.ts` (UPDATE: add full CRUD)

### Admin UI Pages

#### Delinquencies Dashboard (`/admin/delinquencies`)
- Table: Bill ID | Company | Amount | Status | Days Overdue | Last Attempt | Action
- Filters: status (open, past_due, uncollectible), days_overdue (7+, 14+, 30+), saasTier
- Sort: by daysOverdue DESC, totalCents DESC
- Bulk actions: "Retry selected", "Waive late fees", "Manual review"
- KPI cards: total delinquent, total days overdue (sum), recovery rate (% paid after dunning)

#### Bill Detail Page (`/admin/delinquencies/[billId]`)
- Bill summary: amount, status, issued/due/paidAt dates
- Line items: detail view with prices
- Dunning history: timeline of all attempts
  - Attempt #1 (3h ago): smart_retry, failed: insufficient_funds
  - Attempt #2 (3h ago): smart_retry, failed: insufficient_funds
  - Late fee assessed: +$15 (3h ago)
  - Attempt #3 (pending): fallback, scheduled for 12h from now
- Manual overrides section:
  - "Adjust bill amount" (input + reason)
  - "Waive late fee" (confirmation)
  - "Retry now" (optional: select payment method)
- Payment method info: primary + fallback (masked, last 4 digits)
- Customer contact info: name, email, support link

### tRPC Endpoints (Complete Set)
```typescript
admin.delinquencies.list({
  status?: 'open' | 'past_due' | 'uncollectible',
  saasTier?: 'lite' | 'plus' | 'pro',
  daysOverdue?: number,
  limit?: 50, offset?: 0
}) → { bills: [...], total: number }

admin.delinquencies.get({ billId }) → {
  bill: Bill,
  lineItems: BillLineItem[],
  dunningAttempts: DunningAttempt[],
  paymentMethods: PaymentMethod[],
  user: User
}

admin.delinquencies.adjustBill({
  billId, adjustmentCents, reason, createdBy
}) → { bill: Bill }

admin.delinquencies.waiveFee({
  billId, reason, createdBy
}) → { bill: Bill }

admin.delinquencies.retryNow({
  billId, paymentMethodId?: string, createdBy
}) → { dunningAttemptId: string, nextRetryAt: Date }

admin.delinquencies.bulkRetry({
  billIds: string[], createdBy
}) → { retried: number, failed: number }
```

### Database Schema Additions
```
adminAuditLog (NEW):
  id, adminId, action, target_type (bill), targetId, 
  changes (JSON: { field, before, after }), reason, createdAt

notifications (UPDATE):
  Add: relatedBillId, actionUrl (link to bill detail or payment)
```

### Success Criteria
- Dashboard loads in <1s for up to 1000 delinquent bills
- Retry creates PaymentIntent + dunning attempt record atomically
- Audit log tracks all admin actions for compliance
- Bulk operations complete without timeout (>100 bills)

---

## Phase 6: User-Facing Billing UI

Build customer-visible billing pages and payment method management.

### Goals
- Bills page: list, filter, search
- Bill detail: line items, payment history, retry status
- Payment method management: add ACH, set primary, remove, view pending
- Settings: billing day, payment preferences, receipt delivery

### Key Files
- `apps/web/src/app/(app)/billing/page.tsx` (NEW: bills list)
- `apps/web/src/app/(app)/billing/[billId]/page.tsx` (NEW: bill detail)
- `apps/web/src/app/(app)/settings/billing/page.tsx` (NEW: settings)
- `apps/web/src/components/payment-methods/index.tsx` (NEW: ACH management)

### User UI Pages

#### Bills Page (`/app/billing`)
- Hero: "Billing & Payments"
- Preview card: "Next bill estimate: $XXX.XX" (linked to current cycle preview)
- Table: Date | Amount | Status | Action
- Status badges: paid (green), pending (yellow), overdue (red), failed (red)
- Actions: View details, Download PDF, Retry payment (if failed)
- Empty state: "No bills yet. Check back on your billing day."

#### Bill Detail Page (`/app/billing/[billId]`)
- Bill header: amount, issued date, due date, status
- Line items table: Description | Amount (passthrough, SaaS fee, overage, late fee)
- Payment status section:
  - Status badge + timestamp
  - If failed: failure reason + "Retry now" button
  - If pending: "Retrying at ${nextRetryAt}"
  - If paid: receipt link, payment method used
- Related actions: Download PDF, Contact support

#### Billing Settings Page (`/app/settings/billing`)
- Section: Billing Information
  - Billing day (select 1-31, or "auto")
  - Currency preference
- Section: Payment Methods
  - Card 1: Primary (with checkmark) | Last 4 | Exp | Remove
  - Card 2: Fallback | Last 4 | Exp | Set as primary | Remove
  - Add payment method: "Link ACH account via Plaid" or "Add credit card"
- Section: Notification Preferences
  - Email on bill issued (toggle)
  - Email on payment due (toggle)
  - SMS alerts for overdue (toggle)
  - Email receipts (toggle)

### tRPC Endpoints (User)
```typescript
bills.list({ limit?: 20, offset?: 0 }) → {
  bills: (Bill & { lineItems: BillLineItem[], dunningAttempts: DunningAttempt[] })[],
  total: number
}

bills.get({ id }) → Bill & { lineItems, dunningAttempts }

bills.preview() → (Phase 3: current cycle preview)

bills.downloadPdf({ id }) → { url: string, expiresAt: Date }

paymentMethods.list() → PaymentMethod[]

paymentMethods.setPrimary({ id }) → { ok: true }

paymentMethods.remove({ id }) → { ok: true }

paymentMethods.addAch({
  accountNumber, routingNumber, accountType, accountHolderName
}) → { paymentMethod: PaymentMethod, requiresVerification?: boolean }

users.updateBillingPreferences({
  billingDay?: number,
  preferSms?: boolean,
  receiptDelivery?: 'email' | 'none'
}) → { user: User }
```

### PDF Generation
- Trigger via `bills.downloadPdf({ billId })` → returns presigned S3 URL
- Inngest job: `generate-bill-pdf`
  - Template: MiddleMan invoice letterhead
  - Sections: bill header, line items, payment info, terms
  - Store in S3: `s3://middleman-docs/bills/${billId}.pdf` (7-day expiry)

### Plaid Integration (ACH Linking)
- Reuse existing Plaid SDK integration (already set up for virtual cards)
- Flow: User clicks "Link ACH" → Plaid Link modal → onSuccess callback
- Create paymentMethod record with Plaid item token
- No manual bank verification needed (use Plaid's instant verification)

### Success Criteria
- Bills page loads in <1s with pagination
- Bill detail shows all line items + dunning history correctly
- ACH linking via Plaid completes in <2 min
- PDF generated + available within 5s
- Payment retry button works end-to-end

---

## Implementation Sequence & Dependencies

### **Parallel Track Model**

Two teams work simultaneously with clear dependency boundaries:
- **Backend Track**: Payment collection, dunning, billing services, APIs
- **Frontend Track**: Admin UI, customer UI, notifications UI (uses backend APIs)

### Week 1: Foundation Phase (Parallel)

**Backend (Phase 1 + 2 core)**
- Mon-Tue: Payment collection engine (PaymentIntent, webhook handlers)
  - Services: `payment-collection.ts`, webhook handlers
  - **Blocker**: Stripe sandbox PaymentIntent testing
- Wed-Thu: Dunning state machine completion (smart retry: 12h→24h→48h, late fee)
  - Inngest functions: `dunning.ts` with step orchestration
  - **Deliverable**: API ready for frontend
- Fri: Integration testing (bill.issued → payment.succeeded)

**Frontend (Setup + Stubs)**
- Mon-Tue: Design bills/delinquencies pages (Figma → components)
  - Create page stubs: `/billing`, `/admin/delinquencies`
  - **Dependency**: Awaiting Phase 1 APIs
- Wed-Thu: Payment method management UI skeleton
  - Create `payment-methods/` components
  - **Dependency**: Awaiting payment method endpoints
- Fri: Integration with Phase 1 APIs (when ready)

### Week 2: Admin Infrastructure (Parallel)

**Backend (Phase 2 finish + 3)**
- Mon-Tue: Bill preview endpoint + admin adjustment flows
  - Services: `billing.previewCurrentCycle()`, `billing.applyAdjustment()`
  - Routers: `admin/delinquencies.ts` mutations
  - **Deliverable**: All admin endpoints ready
- Wed-Thu: Audit logging for admin actions
  - Schema: `adminAuditLog` table
  - Middleware: Track all admin mutations
- Fri: Admin API integration tests

**Frontend (Phase 5 + partial Phase 6)**
- Mon-Tue: Delinquencies dashboard implementation
  - Table: List delinquent bills, filters, bulk actions
  - **Uses**: `admin.delinquencies.list()` endpoint
- Wed-Thu: Bill detail page + dunning log view
  - Timeline view of dunning attempts
  - **Uses**: `admin.delinquencies.get()`, retry/adjust endpoints
- Fri: Testing + polish

### Week 3: Communications + Customer UI (Parallel)

**Backend (Phase 4 core)**
- Mon-Tue: Email/SMS notification templates + Inngest functions
  - Templates: bill issued, payment due, failed, succeeded, late fee
  - Functions: `notifications.ts` with template routing
  - **Deliverable**: Notification system live
- Wed-Thu: In-app notifications system
  - Schema: `notifications` table
  - Endpoint: `notifications.list()`, `notifications.markAsRead()`
  - WebSocket/polling fallback
- Fri: Notification integration with phases 1-3

**Frontend (Phase 6 complete)**
- Mon-Tue: Customer bills page (list + preview)
  - Hero card: Next bill estimate
  - Table: Past bills with status + actions
  - **Uses**: `bills.list()`, `bills.preview()` endpoints
- Wed-Thu: Bill detail page + payment method UI
  - Line items, dunning history (user view)
  - ACH linking via Plaid
  - **Uses**: `bills.get()`, `paymentMethods.*` endpoints
- Fri: Billing settings page + notification preferences

### Week 4: Polish & Launch (Sequential)

**Comprehensive Integration**
- Mon-Tue: End-to-end testing (all user journeys)
  - Backend: Payment succeeds → bill marked paid → ledger updated
  - Frontend: User sees bill issued → payment failed → notification → retry
- Wed: Compliance + security review (PCI, Stripe best practices)
  - Idempotency keys verified
  - Webhook signatures validated
  - Ledger double-entry invariant checked
- Thu: Staging → production cutover
  - Stripe live keys configured
  - SMS/email providers verified
  - Monitoring + alerting in place
- Fri: Monitoring + incident response on-call

---

## Parallel Tracks Dependencies

**Frontend can proceed without Backend only if:**
- Mock API responses provided (Storybook stories)
- Component interfaces defined in TypeScript

**Backend must be ready before Frontend can integrate:**
- Phase 1 APIs: `payment-collection-job`, webhook handlers
- Phase 2 APIs: `dunning-state-machine`, late fee logic
- Phase 3 APIs: `bills.preview()`, `bills.retry()`, admin adjust endpoints
- Phase 4 APIs: Notification endpoints + WebSocket setup
- Phase 6 APIs: `bills.list()`, `bills.get()`, `paymentMethods.*`

**Integration Checkpoints:**
- Week 1 Friday: Phase 1 APIs → Frontend integration testing begins
- Week 2 Friday: Phase 2-3 APIs → Admin UI fully functional
- Week 3 Friday: Phase 4 APIs → Customer UI shows notifications
- Week 4 Monday: Full E2E test pass

---

## Integration Checklist

- [ ] Stripe webhook signatures validated (use raw body)
- [ ] PaymentIntent idempotency keys prevent duplicate charges
- [ ] Ledger double-entry invariant maintained on all payment flows
- [ ] Dunning attempts linked to paymentMethods (track which method failed)
- [ ] Bill status never goes backward (paid → past_due is invalid)
- [ ] Late fees assessed only once per bill
- [ ] Ops escalation idempotent (don't send multiple Slacks)
- [ ] Email deliverability tested (spam folder checks)
- [ ] Admin audit log immutable (no deletion, only appending)
- [ ] Customer notifications exclude PII in URLs/emails
- [ ] Rate limits on retry endpoints (1 retry per minute per bill)
- [ ] Exhaustion handler for dunning (if 5+ attempts all fail, pause dunning)
- [ ] Retry backoff timing verified: 12h → 24h → 48h
- [ ] Frontend/Backend parallel tracks synchronized at checkpoints

---

## Success Metrics

- Payment collection rate: >95% (paid within 3 attempts)
- Days to payment: <3 days (median time from issue to receipt)
- Dunning efficiency: >80% of past_due bills recover via state machine
- Ops escalation: <5% of bills reach uncollectible status
- Admin resolution time: <30 min from escalation to manual override
- Customer satisfaction: <2% billing-related support tickets
