# MiddleMan Function Sheet

**Subscription Bill Consolidation & Spending Control Platform**

---

## Core Value Propositions

### 1. **Manage Subscriptions**
Automatically discover all your recurring subscriptions from your bank account and manage them in one place.

**Features:**
- **Auto-Discovery**: Link your bank account via Plaid to automatically discover all active subscriptions (Netflix, Spotify, AWS, Adobe, etc.)
- **Centralized Dashboard**: View all 5-100+ subscriptions in one place with amount, billing frequency, and status
- **Pause/Resume**: Instantly pause a subscription without canceling—resume anytime without signing up again
- **Cancellation Playbooks**: One-click guides to cancel any subscription provider with step-by-step instructions
- **Provider Mapping**: Unknown merchants automatically identified; ops team manually maps unknowns to providers
- **Subscription Status Tracking**: Real-time status: active, paused, canceled, with dates

**Technical Implementation:**
- Plaid Recurring Transactions API for bank transaction analysis
- Provider catalog with 50+ major services (Netflix, Spotify, AWS, Apple, Adobe, Microsoft 365, etc.)
- Manual merchant linking via admin console for unknown merchants
- Inngest-powered background sync (plaid-recurring-sync)

---

### 2. **Lower Your Bills**
Get visibility into your total spending and automatically negotiate better rates with providers.

**Features:**
- **Spending Dashboard**: Real-time view of total monthly subscription costs
  - Breakdown by category (streaming, productivity, cloud services, etc.)
  - Month-over-month comparison
  - Projections based on current active subscriptions
- **Virtual Card per Subscription**: Each subscription gets its own Stripe Issuing virtual card with a monthly spending cap
  - Prevents overspending on any single service
  - Monitors usage patterns
  - Alerts at 80% cap utilization
- **Consolidated Billing**: One monthly bill from MiddleMan
  - Passthrough charges (sum of all subscriptions)
  - SaaS tier fee (Lite: $5.99/5 subs, Plus: $10.99/10 subs, Pro: $19.99/20 subs, then $1/sub)
  - Late fees ($15 if payment is past due)
  - Overage fees for subscriptions beyond plan tier
- **Bill Preview**: See your next bill before it's issued
  - Unbilled charges in current cycle
  - Projected SaaS tier based on active subscriptions
  - Scheduled charges coming up
- **Smart Payment Options**: ACH debit, secondary payment method fallback, virtual card auth
  - Automatic retry on failure (12h → 24h → 48h backoff)
  - Smart dunning state machine for failed payments
  - 3 retries before late fee assessment

**Technical Implementation:**
- Double-entry ledger accounting (asset_float, asset_receivable, liability_provider_owed, revenue_saas/overage/late)
- Bill generation service with SaaS tier calculation
- Virtual card spending cap enforcement via edge runtime webhook (<2s SLA)
- Stripe Payment Intent for ACH + card authorization
- Inngest dunning state machine with smart retry

---

### 3. **Make a Custom Budget & Grow Your Savings**
Take control of your subscription spending and identify opportunities to save.

**Features:**
- **Custom Budget Setting**: Set your own monthly subscription budget
  - Visual progress bar showing spending vs. budget
  - Alerts when approaching budget cap
  - Recommendations to pause or cancel to stay within budget
- **Savings Opportunities**: AI-powered (future) or manual identification of:
  - Duplicate subscriptions (e.g., 2x Spotify accounts)
  - Low-usage services (tracked via spending activity)
  - Similar services you can consolidate (e.g., Notion + OneNote)
  - Cheaper tier options (e.g., Netflix Basic → Standard)
- **Spending Analytics**:
  - Subscription spending trends (increasing/decreasing)
  - Category breakdown (streaming 40%, productivity 30%, cloud 20%, other 10%)
  - Cost per use (e.g., $0.50 per Netflix watch, $2 per Spotify song)
  - Year-over-year comparison
- **Pause Before Cancel**: Easily pause subscriptions you might return to
  - No commitment to cancellation
  - Resume anytime without signup hassles
  - MiddleMan tracks where you paused for easy re-enablement
- **Billing Settings**: 
  - Choose your own billing day (1-31 or "auto")
  - Notification preferences (email, SMS, in-app)
  - Receipt delivery to email or Notion
  - Payment method management (primary + fallback ACH)
- **Savings Dashboard** (future):
  - Total saved this month/year
  - Projected savings if you cancel N subscriptions
  - "What-if" tool: toggle subscriptions on/off to see bill impact

**Technical Implementation:**
- User preferences schema (billingDay, budget, notification preferences)
- Bill preview endpoint with real-time charge calculation
- Dunning attempt log showing retry history
- Admin adjustment flow for manual fee waivers
- Notification system (email, SMS, in-app, Slack)
- Audit trail for all user actions (pause, resume, manual changes)

---

## How It Works (End-to-End User Journey)

### Week 1: Discovery & Setup
1. User signs up with email (Clerk auth)
2. Links bank account via Plaid
3. MiddleMan auto-discovers subscriptions from recurring transactions
4. User confirms/edits discovered subscriptions
5. Sets billing day and payment method preference

### Week 2-3: Virtual Cards & Identity Verification
1. User completes Stripe Identity KYC (selfie + government ID)
2. MiddleMan creates Stripe cardholder profile
3. System issues one virtual card per active subscription
4. Each card gets monthly spending cap (subscription amount + 10% buffer)
5. Test charge ($0.01) validates each card
6. Subscriptions marked "active" and ready for billing

### Week 4: First Billing Cycle
1. Billing day arrives (user-selected date)
2. MiddleMan closes billing cycle:
   - Aggregates all captured charges from virtual cards
   - Calculates SaaS tier fee based on active subscription count
   - Generates bill with passthrough + fees + line items
3. Bill transitions: draft → open → payment collection
4. Stripe PaymentIntent created for ACH debit
5. Payment succeeds → bill marked "paid", ledger updated
6. OR payment fails → dunning state machine activated (3 smart retries + late fee)
7. Email notification sent: "Your MiddleMan bill is ready" or "Payment failed"

### Ongoing: Spending Management
1. User logs into MiddleMan dashboard
2. Views all subscriptions + total spending
3. Can pause subscriptions anytime (no cancellation)
4. Can resume paused subscriptions (virtual card re-activated)
5. Views bill preview for next cycle
6. Reviews bill history + payment status
7. Can manually retry failed payments
8. Receives alerts when approaching budget cap
9. Sees recommendations to reduce spending

---

## Tier Pricing Structure

| Tier | Subscriptions | Monthly Fee | Overage |
|------|---------------|-------------|---------|
| Lite | 1-5 | $5.99 | — |
| Plus | 6-10 | $10.99 | — |
| Pro | 11-20 | $19.99 | — |
| Overage | 21+ | $19.99 | +$1/sub |

**Example:**
- User with 3 subscriptions → Lite tier ($5.99)
- User with 8 subscriptions → Plus tier ($10.99)
- User with 25 subscriptions → Pro base ($19.99) + 5 overages ($5.00) = $24.99

---

## Technical Architecture Summary

### Frontend (Next.js 15 Web App)
- `/subscriptions` — List all discovered subscriptions
- `/subscriptions/[id]` — Single subscription detail + virtual card management
- `/billing` — View all bills + payment history
- `/billing/[billId]` — Bill detail with line items + dunning log
- `/settings/billing` — Billing preferences + payment methods
- `/dashboard` — Home page with spending overview + alerts

### Backend (tRPC + Inngest)
- **Services**: subscriptions, issuing, billing, kyc, notifications, catalog
- **Routers**: subscriptions, bills, payment-methods, kyc, cancellations, admin/*
- **Jobs**:
  - `plaid-recurring-sync` — Auto-discover subscriptions
  - `cycle-close-scheduler/worker` — Billing cycle closure
  - `payment-collection` — ACH debit initiation
  - `dunning-state-machine` — Payment retry logic
  - `card-auth` — Track spending on virtual cards
  - `first-charge` — Test charge validation
  - `notifications` — Email/SMS/in-app alerts

### Database (PostgreSQL + Drizzle)
- Tables: users, subscriptions, virtualCards, bills, billLineItems, charges, dunningAttempts, paymentMethods, ledgerEntries, kycProfiles, notifications, adminAuditLog

### Payment Infrastructure
- **Stripe Issuing**: Virtual cards (1 per subscription with spending caps)
- **Stripe Billing**: PaymentIntent for ACH + card collection
- **Stripe Identity**: KYC verification (selfie + ID scan)
- **Stripe Radar**: Fraud detection (future enhancement)
- **Plaid**: Bank account linking + recurring transaction discovery

---

## Security & Compliance

- **PII Encryption**: Government IDs, bank account numbers stored via AWS KMS envelope encryption
- **Row-Level Security (RLS)**: PostgreSQL policies on all user-facing tables
- **Webhook Signature Verification**: All Stripe/Plaid webhooks validated via JWT
- **Idempotent Operations**: Payment intents use idempotency keys to prevent duplicate charges
- **Double-Entry Ledger**: All financial flows verified via accounting invariants
- **Audit Trail**: All admin actions logged with user, timestamp, changes
- **PCI Compliance**: No card data stored (delegated to Stripe)

---

## Success Metrics

- **User Engagement**: 80%+ monthly active users managing subscriptions
- **Payment Success**: 95%+ bills paid within 3 payment attempts
- **Customer Satisfaction**: <2% billing-related support tickets
- **Spending Insights**: Average user reduces subscription spend by 15-20% after using MiddleMan
- **Retention**: 90%+ month-over-month retention after first billing cycle
- **Platform Stability**: 99.9% uptime, <100ms P95 latency on all user-facing endpoints

---

## Roadmap

**M1 ✅ — Foundation** (Complete)
- Full tech stack (Turborepo, Next.js, tRPC, Drizzle, Inngest, Stripe, Plaid)

**M2 ✅ — Subscription Discovery** (Complete)
- Auto-discover via Plaid, merchant mapping, provider catalog

**M3 ✅ — Stripe Issuing & KYC** (Complete)
- Virtual card issuance, identity verification, per-subscription spending caps

**M4 📊 — Billing Engine & Dunning** (In Progress)
- Automated bill generation, payment collection, smart dunning, notifications

**M5 📈 — Admin Console & Observability** (Upcoming)
- Delinquencies dashboard, audit logs, ops alerts, observability

**M6 🔒 — Launch Prep & Hardening** (Upcoming)
- Load testing, security review, DR drill, production switch

**M7 📱 — iOS App** (Upcoming v1.1)
- React Native mobile app with feature parity

**M8 🇨🇦 — Canada Expansion** (Upcoming)
- CAD payments, Interac/EFT, multi-currency billing

---

**Last Updated**: 2026-06-04  
**Status**: M4 (Billing Engine) in progress  
**Contact**: engineering@middleman.dev
