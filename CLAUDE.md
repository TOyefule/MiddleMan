# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

MiddleMan is a **Turborepo monorepo** with pnpm workspaces. The structure is:

```
apps/
  web/        Next.js 15 consumer app (user-facing)
  admin/      Next.js 15 internal ops console
packages/
  db/         Drizzle ORM schema + RLS policies + migrations
  api/        tRPC server (routers, services, context, types)
  ui/         Shared React components + React Email templates
  jobs/       Inngest background jobs (cron + event-driven)
  config/     Shared TypeScript, ESLint, Tailwind, Prettier configs
```

## Quick Commands

### Development
```bash
nvm use                    # Use Node 20.10.0
corepack enable           # Enable pnpm package manager
pnpm install              # Install all workspace dependencies
cp .env.example .env.local # Set up environment variables
pnpm dev                  # Start all apps (web:3000, admin:3001, inngest:8288)
```

### Database
```bash
pnpm db:generate          # Generate Drizzle types from schema
pnpm db:migrate           # Run pending migrations against DIRECT_URL or DATABASE_URL
pnpm db:studio            # Open Drizzle Studio (local schema browser)
```

### Code Quality
```bash
pnpm build                # Build all packages
pnpm lint                 # Run ESLint across all packages
pnpm typecheck            # Run TypeScript type checking
pnpm test                 # Run test suites (if tests exist)
pnpm format               # Format code with Prettier
pnpm format:check         # Check Prettier formatting without changes
```

## Core Architecture

### Authentication & Authorization
- **Clerk** handles user signup/login and provides JWT with `sub` claim (user ID)
- **Row-Level Security (RLS)** policies on all tables keyed to `current_user_id()` derived from Clerk JWT
- Admins stored in `admin` table; verified via `is_admin()` helper in RLS policies
- **tRPC context** extracts Clerk auth and hydrates user/admin rows from DB

### API Layer (tRPC)
- **packages/api/src/trpc.ts**: Initializes tRPC with procedures:
  - `publicProcedure`: No auth required
  - `protectedProcedure`: Requires authenticated user
  - `adminProcedure`: Requires admin role
- **packages/api/src/routers/**: Organized by domain (subscriptions, bills, kyc, admin, etc.)
- **packages/api/src/services/**: Business logic (billing, issuing, KYC, notifications, etc.)
- **packages/api/src/lib/**: Infrastructure (Stripe, Plaid, KMS, Redis, rate limiting, error types)

### Database (Drizzle + RLS)
- **Schema** in `packages/db/src/schema/` organized by entity (users, subscriptions, charges, bills, etc.)
- **Migrations** in `packages/db/migrations/`; run via `pnpm db:migrate`
- **RLS** enabled via `migrations/0001_enable_rls.sql` with deny-by-default policies
- **Key tables**: users, kyc_profiles, payment_methods, subscriptions, virtual_cards, charges, bills, bill_line_items, ledger_entries (double-entry accounting), dunning_attempts, notifications, admin, webhooks

### Double-Entry Ledger
All money movements recorded in `ledger_entries` table with paired debit/credit entries:
- `asset_float` ← captured charges from virtual cards
- `liability_provider_owed` ← money owed to subscription providers
- `asset_receivable` ← money owed by users
- `revenue_saas` ← SaaS tier fees
- `revenue_overage` ← fees for subscriptions exceeding tier limit
- Used for reconciliation and audit trail

### Jobs (Inngest)
- **packages/jobs/src/functions/**: Cron jobs and event-driven workers
- **cycle-close**: Hourly cron finds users whose billing day is today, triggers bill issuance
- **dunning**: Listens to failed payments, retries via Stripe Smart Retries with fallback method logic
- **plaid-recurring-sync**: Listens for Plaid recurring transaction updates (M2 implementation)
- **nightly-backup**: Daily health check that S3 backup exists

### Webhook Handling
Three webhook routes with different guarantees:

1. **Stripe Issuing Auth** (`/api/webhooks/stripe-issuing`, **EDGE RUNTIME**)
   - <2s SLA requirement
   - Syncs: Redis cache lookup → card balance check → approval decision
   - Async: Sends charge.authorized event to Inngest
   - Falls back to rejection if verification fails (not timeout)

2. **Stripe Billing** (`/api/webhooks/stripe-billing`, Node runtime)
   - Idempotency: Checks `webhook_events.externalId`
   - Handles: invoice.payment_succeeded, invoice.payment_failed, identity.verification_session.*

3. **Clerk User** (`/api/webhooks/clerk`, Node runtime)
   - Handles: user.created (inserts row, 30-day trial), user.updated (syncs email/phone), user.deleted (soft-delete)

All webhook routes verify signatures and write to `webhook_events` table for idempotency + audit.

## Key Patterns & Constraints

### Subscription States
- `tracking_only`: Manually added subscription, not yet issued a card
- `active`: Virtual card issued, ready to charge
- `paused`: Card paused via Stripe Issuing, user can resume
- `canceled`: User confirmed cancellation

### Virtual Card Lifecycle
1. User completes full KYC (`kyc_profiles.status = 'verified'`)
2. On manual sub add or Plaid discovery, create Stripe Issuing card with spending cap
3. Card cached in Redis (TTL 300s) for fast Issuing auth webhook lookup
4. Pause/resume via Stripe API + local DB status sync

### KYC Flow
- Light KYC at signup (Clerk handles email + phone OTP)
- Full KYC before first card issue (Stripe Identity with document + selfie + live capture)
- Manual review queue in admin console for failed verifications

### Billing & Dunning
- User's billing day is configurable (1–28)
- Cycle close triggered hourly; bills issued on user's billing day
- Dunning state machine: up to 3 smart retries → fallback method → late fee ($15) → ops escalation

### Rate Limiting
Pre-built Upstash Ratelimit instances in `packages/api/src/lib/rate-limit.ts`:
- `authBurst`: 5 per 1 minute
- `subAdd`: 30 per 1 hour
- `pmChange`: 5 per 1 hour
- `kycRetry`: 3 per 24 hours

### Encryption (AWS KMS)
- PII fields (SSN, DOB, address) encrypted via AWS KMS with envelope encryption context
- Helper: `encryptField()` / `decryptField()` in `packages/api/src/lib/kms.ts`

## Web App (`apps/web`)

- **Next.js 15** with App Router
- **Middleware** via Clerk: protects all routes except public (/, /sign-in, /sign-up) + webhooks
- **Protected routes** under `(dashboard)`: subscriptions, bills, kyc, settings
- **tRPC client** via `@trpc/react-query` with superjson transformer
- **Clerk auth** used for signup/login; Clerk JWT required in tRPC context

### Key Pages
- `/`: Public homepage
- `/subscriptions`: List + manage user subscriptions
- `/bills`: View historical and current-period bills
- `/kyc`: Check KYC status, start Stripe Identity if needed
- `/settings`: Update profile, configure billing day

## Admin App (`apps/admin`)

- **Next.js 15** with App Router
- **Middleware** via Clerk: protects all routes (no public routes)
- **Role-based access** via `admin` table; checked in tRPC adminProcedure
- **6 main screens** (mostly M5 placeholders in V1):
  - **Delinquencies**: Past-due and uncollectible bills
  - **KYC Queue**: Manual review entries
  - **Float Caps**: Override user monthly spending limits (audit logged)
  - **Fraud**: Stripe Radar alerts (M5)
  - **Unknown Merchants**: Subscriptions not matched to provider catalog
  - **Audit**: Append-only log of admin actions

## Environment Variables

Critical vars (defined in `turbo.json` globalEnv):
- **Database**: `DATABASE_URL`, `DIRECT_URL` (latter required for migrations)
- **Clerk**: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET`
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ISSUING_WEBHOOK_SECRET`
- **Plaid**: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` (sandbox|development|production)
- **Inngest**: `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- **Upstash**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **AWS**: `AWS_REGION`, `AWS_KMS_KEY_ID`, `AWS_S3_BACKUP_BUCKET`
- **Notifications**: `RESEND_API_KEY` (email), `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM_NUMBER` (SMS)
- **Observability**: `SENTRY_DSN`, `BETTERSTACK_SOURCE_TOKEN`, `SLACK_OPS_WEBHOOK_URL`

Full template: `.env.example`

## Testing & Debugging

### Local Database Testing
```bash
pnpm db:migrate          # Run migrations locally
pnpm db:studio           # Browse schema in browser
```

### Webhook Testing
Use Stripe CLI or Ngrok to forward webhooks to localhost. Webhook handlers are idempotent via `webhook_events.externalId` uniqueness constraint.

### Inngest Dev Server
Starts automatically on port 8288 when `pnpm dev` runs. Web UI at `http://localhost:8288` shows job runs, events, logs.

### Rate Limit Testing
Check `packages/api/src/lib/rate-limit.ts` for pre-built instances. Rate limit errors throw TRPCError with code='TOO_MANY_REQUESTS'.

## Deployment

- **Monorepo**: Turbo handles build parallelization and caching
- **Vercel**: Deploy `apps/web` and `apps/admin` separately as independent projects
- **Database**: Uses Supabase (managed Postgres); `DIRECT_URL` points to non-pooled connection for migrations
- **Edge Runtime**: Stripe Issuing webhook (`/api/webhooks/stripe-issuing`) must run on Edge for <2s SLA
- **Secrets**: Use Vercel Environment Variables or Doppler for secret management

## Adding New Features

### New API Endpoint
1. Create router file in `packages/api/src/routers/` (or add to existing)
2. Define Zod schema for input (e.g., `UpdateBillingDayInput`)
3. Create procedure in router (publicProcedure, protectedProcedure, or adminProcedure)
4. Call service layer from `packages/api/src/services/` if logic is reused
5. Wire router in `packages/api/src/routers/_app.ts`
6. Use in web/admin apps via `trpc.<router>.<procedure>.useQuery()` or `.useMutation()`

### New Database Table
1. Create schema file in `packages/db/src/schema/` (e.g., `new_entities.ts`)
2. Export type from `packages/db/src/schema/index.ts`
3. Re-export inferred type in `packages/db/src/types.ts`
4. Run `pnpm db:generate` to create migration file
5. Add RLS policy in migration if user-facing (keyed to `user_id = current_user_id()`)
6. Run `pnpm db:migrate` to apply

### New Inngest Job
1. Add event schema to `packages/jobs/src/events.ts`
2. Create function file in `packages/jobs/src/functions/`
3. Export function in `packages/jobs/src/index.ts`
4. Trigger from service layer via `inngest.send({ name: 'event.name', data: {...} })`

## Common Gotchas

- **RLS policies block by default**: Every table has deny-by-default RLS. Without an explicit ALLOW policy, queries return no results.
- **DIRECT_URL required for migrations**: Database pooling breaks Drizzle migrations. `DIRECT_URL` must point to non-pooled Postgres connection.
- **Edge runtime limitations**: Issuing webhook runs on Edge; can't use Prisma or heavy crypto. Uses `getEdgeDb()` with Neon HTTP driver.
- **Webhook idempotency**: Always check `webhook_events.externalId` before processing to handle retries.
- **Virtual card caching**: Issuing auth webhook relies on Redis cache (300s TTL) for <2s SLA. Cache invalidation via `invalidateCardCache()` must be called after card updates.
- **Clerk JWT `sub` claim**: RLS policies depend on this claim in auth token. If Clerk org/user model changes, update `current_clerk_user_id()` helper.

## M1 Status

V1 milestone complete: full foundation scaffolded with all 13 tech layers integrated. All code generated and committed.

Pending phases:
- **M2**: Subscription discovery (Plaid Recurring API, provider direct connectors)
- **M3**: Stripe Issuing + KYC production (program application, edge auth webhook integration)
- **M4**: Billing engine + dunning (full state machine, ACH debit, late fees)
- **M5**: Admin console full UI + observability (all screens, BetterStack logs, Sentry alerts)
- **M6**: Launch prep (load test, security review, DR, production switch)
