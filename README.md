# MiddleMan

US-only subscription bill consolidation. We put a unique Stripe Issuing virtual card on every provider, pay them as they bill, then debit the user once a month for the passthrough total plus a SaaS tier fee.

## Repo layout

```
apps/
  web/        Next.js 15 consumer app (signup, link bank, manage subs, view bills)
  admin/      Next.js 15 internal ops console
  mobile/     placeholder — v1.1 (React Native)
packages/
  db/         Drizzle schema, Supabase migrations, RLS policies
  api/        tRPC routers, zod schemas, service modules
  ui/         shared shadcn primitives + react-email templates
  jobs/       Inngest cron + event-driven functions
  config/     shared tsconfig, eslint, tailwind, prettier
```

## Quick start

```bash
# Prereqs: Node 20.10+, pnpm 9
nvm use
corepack enable
pnpm install

# Fill in secrets
cp .env.example .env.local
# (or: doppler setup && doppler run -- pnpm dev)

# Run the database migrations against a local or remote Supabase
pnpm db:migrate

# Start everything
pnpm dev
```

Web app runs on `http://localhost:3000`, admin on `http://localhost:3001`, Inngest dev server on `http://localhost:8288`.

## Documentation

The full V1 plan (decisions, milestones, risks, verification) lives at:
`~/.claude/plans/create-a-suscritption-management-joyful-puffin.md`

## License

Proprietary — all rights reserved.
