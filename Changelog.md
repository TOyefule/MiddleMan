# Changelog

All notable changes to MiddleMan are documented here.

## [Unreleased]

### Added
- GitHub Issues for milestones M2-M8
- CLAUDE.md development guide for future Claude Code sessions
- Comprehensive monorepo documentation

### In Progress
- M2: Subscription Discovery (Plaid Recurring API, provider connectors)
- M3: Stripe Issuing & Full KYC (production approval, edge auth)
- M4: Billing Engine & Dunning (cycle close, ACH, payment retry)
- M5: Admin Console & Observability (full UI, BetterStack, Sentry)
- M6: Launch Prep & Production Hardening (load test, security review)
- M7: iOS App & Mobile Experience (React Native)
- M8: Canada Expansion & Multi-Currency (CAD support, regulatory)

## [0.1.0] - 2026-06-04

### Added
- **M1: MiddleMan Foundation** — Complete tech stack implementation
  - Turborepo monorepo with pnpm workspaces
  - Next.js 15 consumer and admin apps
  - tRPC end-to-end TypeScript API
  - Drizzle ORM with Postgres + RLS policies
  - Clerk authentication with Supabase RLS integration
  - Stripe Issuing for virtual card issuance (one per subscription)
  - Stripe Billing for consolidated invoicing
  - Plaid for bank account linking (framework ready for M2)
  - Inngest for background jobs (cron + event-driven)
  - AWS KMS for PII encryption (envelope encryption ready)
  - Upstash Redis for rate limiting and caching
  - Resend + Twilio for multi-channel notifications
  - Double-entry ledger accounting system
  - Pay-then-bill float model with ACH debit
  - Stripe Smart Retries dunning engine
  - Tiered KYC (light at signup, full before card issuance)
  - Provider catalog with fuzzy merchant matching
  - Edge runtime support for Stripe Issuing auth webhook (<2s SLA)

### Database Schema
- 18 core tables: users, kyc_profiles, payment_methods, providers, provider_plans, subscriptions, virtual_cards, charges, bills, bill_line_items, ledger_entries, dunning_attempts, notifications, notification_preferences, cancellation_requests, admin, webhooks, webhook_events
- Row-level security (RLS) on all user-facing tables
- RLS helper functions: current_clerk_user_id(), current_user_id(), is_admin()
- Append-only audit trail via admin.auditLog table

### API (tRPC)
- 10+ routers: me, subscriptions, payment_methods, bills, cancellations, kyc, admin (delinquencies, kyc_queue, unknown_merchants, float_caps)
- Service layer: subscriptions, catalog, issuing, billing, kyc, notifications, cancellations
- Library modules: Stripe SDK, Plaid SDK, AWS KMS, Upstash Redis, rate limiting, error types
- tRPC procedures: publicProcedure, protectedProcedure, adminProcedure

### Webhooks
- Stripe Issuing authorization (Edge runtime, <2s SLA)
- Stripe Billing (invoice events, identity verification)
- Plaid (recurring transactions, M2 implementation)
- Clerk (user lifecycle: created, updated, deleted)

### Jobs (Inngest)
- Cycle close scheduler (hourly, fan-out to per-user jobs)
- Dunning state machine (payment retry logic)
- Plaid recurring sync (framework ready, M2 implementation)
- Nightly backup health check (daily at 06:00 UTC)

### Web App (Consumer)
- Public homepage
- Protected dashboard (subscriptions, bills, KYC, settings)
- Clerk authentication
- tRPC client with React Query

### Admin App (Ops Console)
- 6 screens: delinquencies, KYC queue, float caps, fraud, unknown merchants, audit log
- Clerk admin role enforcement
- tRPC client with React Query

### UI Library
- Shared React components (Button, Card, Badge, Label, Skeleton, Input)
- React Email templates (bill-issued, payment-failed, cancellation-playbook)
- Tailwind CSS with light/dark mode support
- CSS variable-based theming

### Configuration
- Shared TypeScript configs (base, Next.js, React library)
- Shared ESLint configs (base, Next.js)
- Shared Tailwind preset with CSS variables
- Prettier code formatter
- Node 20.10.0 via .nvmrc

### Environment Setup
- .env.example template with 30+ required secrets
- Support for Doppler secrets manager
- turbo.json global env configuration for 13 layers

### Documentation
- README.md with quick start and repo layout
- CLAUDE.md development guide with architecture, patterns, and troubleshooting
- Comprehensive inline code documentation

---

**MiddleMan is now ready for M2 development: Subscription Discovery with Plaid Recurring API and provider-direct connectors.**
