# Progress

Milestone-by-milestone progress tracking for MiddleMan.

## M1: MiddleMan Foundation ✅ COMPLETE (2026-06-04)

### Status
**SHIPPED** — Full foundation delivered and committed to GitHub.

### Deliverables
- [x] Turborepo monorepo scaffold with pnpm workspaces
- [x] Next.js 15 consumer app (web)
- [x] Next.js 15 admin app (admin)
- [x] Drizzle ORM schema with 18 core tables
- [x] Row-level security (RLS) policies on all user-facing tables
- [x] tRPC server with 10+ routers and service layer
- [x] Clerk authentication integration
- [x] Stripe SDK integration (Issuing, Billing, Radar)
- [x] Plaid SDK integration (framework ready for M2)
- [x] AWS KMS encryption for PII fields
- [x] Upstash Redis for rate limiting and caching
- [x] Inngest job scheduler with 4 functions
- [x] 4 webhook handlers (Stripe Issuing, Stripe Billing, Plaid, Clerk)
- [x] Resend + Twilio notification system (framework ready)
- [x] Double-entry ledger accounting system
- [x] UI component library with shadcn/ui primitives
- [x] React Email templates for transactional mail
- [x] Shared TypeScript, ESLint, Tailwind configs
- [x] Environment configuration with 30+ secrets
- [x] README.md with quick start
- [x] CLAUDE.md development guide
- [x] GitHub repository creation and initial commit
- [x] GitHub Issues for M2-M8 milestones

### Code Quality
- ✅ TypeScript strict mode across all packages
- ✅ ESLint rules enforced (turbo, prettier, TypeScript)
- ✅ Prettier code formatting configured
- ✅ tRPC with end-to-end type safety
- ✅ Zod schema validation on all inputs
- ✅ Database migrations via Drizzle Kit

### Testing
- ⚠️ Unit tests: Not yet implemented (M4+)
- ⚠️ Integration tests: Not yet implemented (M4+)
- ⚠️ Load tests: Not yet implemented (M6)

### Security
- ✅ RLS policies on all user-facing tables
- ✅ AWS KMS envelope encryption for PII (framework ready)
- ✅ Clerk JWT validation via RLS
- ⚠️ Stripe Radar: Not yet configured
- ⚠️ Penetration testing: Scheduled for M6
- ⚠️ Supply chain security audit: Scheduled for M6

### Deployment
- ⚠️ Vercel deployment: Not yet configured
- ⚠️ GitHub Actions CI/CD: Not yet written
- ⚠️ S3 backup automation: Not yet set up

### Commits
- [M1] MiddleMan Foundation — Turborepo scaffold + full tech stack (137 files, 5419 insertions)
- Add CLAUDE.md development guide for future Claude Code instances

---

## M2: Subscription Discovery 🚀 IN PROGRESS

### Status
**ACTIVE DEVELOPMENT** — Phases 1-4 complete; Phase 5 optional.

### Objectives
- ✅ Auto-discover subscriptions via Plaid Recurring API
- ✅ Provider-direct connector framework
- ⚠️ Unknown merchant ops queue (Phase 5, optional)

### Completed Tasks
- [x] Phase 1: Provider catalog seeding (50+ providers, fuzzy patterns)
- [x] Phase 2: Plaid Recurring Transactions API integration
  - [x] plaid_items schema for itemId→userId mapping
  - [x] Inngest plaid-recurring-sync with fetch-streams and upsert-candidates steps
  - [x] Helper functions: mapFrequencyToPeriod(), addFrequencyToDate()
  - [x] Webhook handler lookup userId from plaid_items table
  - [x] Subscription deduplication and catalog matching
- [x] Phase 3: Webhook Signature Verification
  - [x] JWK fetching and caching (1-hour TTL)
  - [x] JWT verification using jose library
  - [x] signatureVerified flag set on webhook_events
- [x] Phase 4: Provider-Direct Connector Framework
  - [x] ProviderConnector interface and _registry.ts
  - [x] discoverAllDirectSources() for future integrations

### Remaining Tasks (Optional Phase 5)
- [ ] Admin unknown-merchants UI (link to provider)
- [ ] Admin create-provider mutations
- [ ] Audit trail for manual mappings

### Estimated Duration
**Complete: 4 commits in 1 session**  
**Phase 5 (optional): 1-2 days if required**

### Success Criteria
- [x] GitHub Issue created (#1)
- [x] Provider catalog seeded (50+)
- [x] Plaid recurring sync implemented end-to-end
- [x] Webhook signatures verified
- [x] Connector framework ready for future providers
- [ ] User can link Plaid account (M3 integration)
- [ ] Recurring transactions auto-discovered and categorized
- [ ] Unknown merchants queued for ops (optional)
- [ ] Plaid webhook events processed reliably

### Commits
- [M2-Phase1] Seed 50+ provider catalog with fuzzy patterns
- [M2-Phase2] Implement Plaid Recurring Transactions API + plaid_items schema
- [M2-Phase3&4] Webhook signature verification + connector framework

### Risks
- ⚠️ Merchant string matching accuracy (mitigated: ops queue for unknowns)
- ✅ Plaid API rate limits (mitigated: Inngest concurrency limit: 20)
- ✅ Provider catalog coverage (mitigated: 50+ common subscriptions seeded)

---

## M3: Stripe Issuing & Full KYC 🎯 UPCOMING

### Status
**BLOCKED on Stripe approval** — Application submission planned after M2.

### Objectives
- Virtual card issuance with per-subscription spending caps
- Complete KYC flow with Stripe Identity
- Edge runtime auth webhook with <2s SLA

### Estimated Duration
**3-4 weeks** (after Stripe approval obtained)

### Success Criteria
- [x] GitHub Issue created (#2)
- [ ] Stripe Issuing production API access
- [ ] Users can verify identity (Stripe Identity)
- [ ] Virtual cards issue on first active subscription
- [ ] Auth webhook responds in <2s (99%ile)

---

## M4: Billing Engine & Dunning 📊 UPCOMING

### Status
**PLANNED** — Can begin after M3 virtual cards are working.

### Objectives
- Automated billing cycle closure
- ACH debit scheduling
- Payment retry (dunning) state machine
- Late fees & adjustments

### Estimated Duration
**3-4 weeks**

### Success Criteria
- [x] GitHub Issue created (#3)
- [ ] Bills auto-generate on user's billing day
- [ ] Correct SaaS tier calculation
- [ ] Payment retry logic working (3 retries → fallback → late fee)
- [ ] Admin can override and retry failed payments

---

## M5: Admin Console & Observability 📈 UPCOMING

### Status
**PLANNED** — Begins after billing engine working.

### Objectives
- Complete all 6 admin screens
- BetterStack logs + status page
- Sentry alerts + Slack routing
- Audit log viewer

### Estimated Duration
**2-3 weeks**

### Success Criteria
- [x] GitHub Issue created (#4)
- [ ] All 6 screens have full UI + real data
- [ ] BetterStack public status page live
- [ ] Ops team receives alerts in Slack
- [ ] Audit log shows all admin actions

---

## M6: Launch Prep & Production Hardening 🔒 UPCOMING

### Status
**PLANNED** — Final hardening before launch.

### Objectives
- Load testing (k6)
- Security review & pentest
- Disaster recovery drill
- Production Stripe switch
- GitHub Actions CI/CD

### Estimated Duration
**2-3 weeks**

### Success Criteria
- [x] GitHub Issue created (#5)
- [ ] System sustains 1000+ concurrent users
- [ ] No critical security findings
- [ ] DR drill completed successfully
- [ ] All production infrastructure verified

---

## M7: iOS App & Mobile Experience 📱 UPCOMING

### Status
**PLANNED** — v1.1 release after launch.

### Objectives
- React Native app with feature parity to web
- Push notifications
- App Store deployment

### Estimated Duration
**4-6 weeks**

### Success Criteria
- [x] GitHub Issue created (#6)
- [ ] iOS app on App Store
- [ ] Feature parity with web app
- [ ] Push notifications delivered reliably

---

## M8: Canada Expansion & Multi-Currency 🇨🇦 UPCOMING

### Status
**PLANNED** — Post-launch expansion.

### Objectives
- Remove US-only restriction
- CAD payment rails (Interac, EFT)
- Multi-currency billing
- Regulatory compliance

### Estimated Duration
**4-6 weeks**

### Success Criteria
- [x] GitHub Issue created (#7)
- [ ] Canadian users can sign up
- [ ] Bills issued in CAD
- [ ] Payment collection via Interac/EFT

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Milestones | 8 total (1 complete, 7 upcoming) |
| GitHub Issues | 7 created (M2-M8) |
| Code Files | 137 created in M1 |
| Lines of Code | 5419+ insertions in M1 |
| Packages | 6 (@middleman/*, @config) |
| Apps | 2 (web, admin) |
| Database Tables | 18 core tables |
| Webhook Handlers | 4 (Stripe Issuing, Stripe Billing, Plaid, Clerk) |
| tRPC Routers | 10+ (me, subscriptions, bills, etc.) |
| Services | 7 (subscriptions, catalog, issuing, billing, kyc, notifications, cancellations) |
| Inngest Functions | 4 (cycle-close, dunning, plaid-recurring-sync, nightly-backup) |

---

## Timeline

```
Jun 2026         Jul 2026         Aug 2026         Sep 2026         Oct 2026
|                |                |                |                |
M1 ✅           M2 🚀           M3 🎯           M4 📊           M5 📈        M6 🔒
COMPLETE       IN QUEUE        UPCOMING        UPCOMING        UPCOMING    UPCOMING
                (2-3 weeks)    (3-4 weeks)     (3-4 weeks)     (2-3 weeks) (2-3 weeks)
                                                                                  |
                                                                            Launch
```

---

**Last Updated**: 2026-06-04  
**Version**: 0.1.0  
**Status**: Foundation Complete, M2 Ready to Begin
