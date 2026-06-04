import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const providers = pgTable(
  'providers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    displayName: text('display_name').notNull(),
    logoUrl: text('logo_url'),
    homepageUrl: text('homepage_url'),
    cancelUrl: text('cancel_url'),
    cancelPlaybookMd: text('cancel_playbook_md'),
    supportsDirectApi: boolean('supports_direct_api').notNull().default(false),
    // Risk classification — some providers flag per-merchant virtual cards
    cardAbuseRisk: text('card_abuse_risk').notNull().default('unknown'), // low|medium|high|unknown
    merchantStringPatterns: text('merchant_string_patterns').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (t) => ({
    slugIdx: uniqueIndex('providers_slug_idx').on(t.slug),
  }),
);

export const providerPlans = pgTable(
  'provider_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    canonicalName: text('canonical_name').notNull(),
    priceCents: integer('price_cents'),
    currency: text('currency').notNull().default('USD'),
    billingPeriod: text('billing_period').notNull().default('monthly'), // monthly|yearly|weekly
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (t) => ({
    providerIdIdx: index('provider_plans_provider_id_idx').on(t.providerId),
  }),
);

export type Provider = typeof providers.$inferSelect;
export type ProviderPlan = typeof providerPlans.$inferSelect;
