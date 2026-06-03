# MiddleMan
MiddleMan is a standalone, brand-new product (not part of the existing Finance Dashboard). 
It's a US-only bill consolidation service: users connect their subscriptions, 
MiddleMan puts a unique virtual card on each provider, pays every provider as charges hit, 
then issues the user one consolidated invoice per month plus a flat SaaS tier fee.

Why build it: Consumers manage 10+ recurring subs across separate cards/banks, 
can't see total monthly burn, and find each cancellation flow hostile. 
MiddleMan absorbs that complexity behind one bill and a single cancel-button-per-sub.



# Product
Scope V1: Full pay-rails day one. Web + admin console only. iOS and Canada deferred to v1.1.
Sub discovery: Manual entry + Plaid Recurring/Transactions auto-detection + a provider-direct connector seam (zero connectors shipped V1, framework exists).
Pay providers: Stripe Issuing — one virtual card per subscription. Per-user collective cap $500/mo (manual lift above). Operating funds pre-funded to Stripe Issuing weekly.
Pay-then-bill: We float for the cycle, ACH-debit (Plaid + Stripe) on the user's bill day.
Bill math: Passthrough of exact provider charges + flat SaaS tier — Lite $5.99 (≤5 subs) / Plus $10.99 (≤10) / Pro $19.99 (≤20) + $1 per sub beyond 20. 30-day free trial on the SaaS fee only.
Recoup methods: ACH primary, card/Apple Pay/Google Pay (Stripe) as fallback.
Dunning: Stripe Smart Retries (3 retries / ~7d) → secondary method → late fee at day 7. No automatic virtual-card pause; manual ops review at day 14.
KYC: Tiered — light at signup (email + phone OTP, tracking only), full Stripe Identity before first virtual card is issued.
Cancellation: Pause that sub's virtual card + send provider-specific cancellation playbook email. We never impersonate the user.
Notifications: Resend (email), Twilio (SMS), Web push, Slack/Discord webhook (ops only). User-controlled preferences.
Tech stack (by layer)
Layer	Choice

L1 Frontend	Next.js 15 (App Router) + React + TypeScript + Tailwind + shadcn/ui
L2 Backend	Next.js Route Handlers + tRPC (end-to-end TS) + Inngest for cron/jobs
L3 DB/Storage	Supabase (Postgres + Storage + Realtime)
L4 Auth	Clerk (JWT template → Supabase RLS)
L5 Hosting	Vercel (web + admin) + Supabase + Inngest
L6 Cloud/IAM	AWS — KMS (envelope encryption), Secrets Manager, S3 (cross-region backups), SES (backup transactional)
L7 CI/CD	GitHub + GitHub Actions, OIDC to AWS (no static keys)
L8 Security	Postgres RLS + KMS-encrypted PII + Cloudflare WAF + Stripe Radar + Doppler secrets
L9 Rate limit	Upstash Redis (per-user) + Cloudflare edge rate limit
L10 Cache/CDN	Cloudflare CDN + Upstash Redis app cache + Vercel static cache
L11 LB/Scale	Vercel autoscale + Supabase PgBouncer + Inngest concurrent workers
L12+L13 Observability/DR	Sentry + BetterStack (logs + uptime + public status page) + Supabase PITR + cross-region S3 dumps + quarterly restore drill
