# Todo

Active tasks and backlog for MiddleMan development.

## Current Sprint: M2 - Subscription Discovery

### High Priority
- [ ] Plaid Recurring Transactions API integration
  - Fetch recurring streams from user's linked bank account
  - Match merchants to provider catalog via fuzzy matching
  - Auto-add as 'plaid' source subscriptions
  - Queue unknown merchants for ops review

- [ ] Complete Inngest plaid-recurring-sync function
  - Wire up Plaid webhook event handling
  - Sync recurring transaction updates to subscriptions table
  - Trigger from plaid.recurring.updated event

- [ ] Provider catalog expansion
  - Add initial set of 50+ common US subscriptions
  - Populate providers table with logoUrl, cancelUrl, playbook docs
  - Define merchantStringPatterns for fuzzy matching

### Medium Priority
- [ ] Provider-direct connector framework
  - Implement 1-2 example connectors (Stripe, Netflix, or Spotify)
  - Validate ProviderConnector interface design
  - Document connector development pattern

## Upcoming: M3 - Stripe Issuing & Full KYC

### High Priority
- [ ] Stripe Issuing production approval
  - Prepare program application
  - Respond to underwriting questions
  - Obtain production API keys

- [ ] Virtual card issuance workflow
  - Create Stripe Issuing card on first subscription (post-KYC)
  - Set per-subscription spending caps
  - Handle card pause/resume

- [ ] Full KYC flow completion
  - Stripe Identity session creation and webhook handling
  - Manual review queue in admin console
  - Approve/deny/request more info workflow

### Medium Priority
- [ ] Edge runtime Stripe Issuing webhook optimization
  - Measure auth webhook latency (<2s SLA)
  - Optimize Redis cache hit rate (300s TTL)
  - Implement fallback approval/denial logic

## Backlog: M4-M8

### M4: Billing Engine & Dunning
- [ ] Billing cycle closure implementation
- [ ] ACH debit scheduling
- [ ] Complete dunning state machine
- [ ] Late fee & adjustment logic

### M5: Admin Console & Observability
- [ ] Complete all 6 admin screens UI
- [ ] BetterStack integration
- [ ] Sentry alert rules
- [ ] Slack ops webhooks

### M6: Launch Prep & Production Hardening
- [ ] k6 load testing
- [ ] Security review & penetration testing
- [ ] Disaster recovery drill
- [ ] Production Stripe switch
- [ ] GitHub Actions CI/CD workflows

### M7: iOS App & Mobile Experience
- [ ] React Native setup
- [ ] Core mobile flows
- [ ] Push notifications
- [ ] App Store deployment

### M8: Canada Expansion & Multi-Currency
- [ ] Geographic expansion (remove US-only)
- [ ] CAD payment rails
- [ ] Multi-currency billing
- [ ] Regulatory compliance

## Infrastructure & DevOps

### CI/CD
- [ ] GitHub Actions ci.yml (lint, typecheck, test)
- [ ] deploy-preview.yml (Vercel preview on PR)
- [ ] nightly-backup.yml (S3 backup verification)

### Observability
- [ ] Set up Sentry project
- [ ] Configure BetterStack logs
- [ ] Create public status page
- [ ] Alert routing to Slack

### Security
- [ ] Pentest scheduling
- [ ] RLS policy audit
- [ ] KMS key rotation policy
- [ ] Dependency scanning

## Known Issues

_None currently. All M1 implementation complete._

## Testing

### Unit Tests (M4+)
- [ ] Service layer tests (billing, issuing, KYC)
- [ ] Router tests (api layer)
- [ ] Component tests (UI library)

### Integration Tests (M4+)
- [ ] Webhook idempotency tests
- [ ] RLS policy validation tests
- [ ] End-to-end payment flows

### Load Testing (M6)
- [ ] k6 script for subscription management
- [ ] k6 script for bill payment
- [ ] k6 script for virtual card issuance

## Documentation

- [x] README.md (quick start, repo layout)
- [x] CLAUDE.md (development guide)
- [ ] Architecture Decision Records (ADRs)
- [ ] Runbooks for common incidents
- [ ] Stripe Issuing integration guide
- [ ] Plaid integration guide
- [ ] Clerk + RLS integration guide

---

**Last Updated**: 2026-06-04
**Sprint**: M2 - Subscription Discovery
**Status**: Active Development
