import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { subscriptionSource, subscriptionStatus } from './enums';
import { users } from './users';
import { providers, providerPlans } from './providers';

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id').references(() => providers.id),
    providerPlanId: uuid('provider_plan_id').references(() => providerPlans.id),
    // Raw user input — when no provider match yet (queued for ops review)
    rawMerchantName: text('raw_merchant_name'),
    source: subscriptionSource('source').notNull(),
    status: subscriptionStatus('status').notNull().default('tracking_only'),
    expectedAmountCents: integer('expected_amount_cents'),
    currency: text('currency').notNull().default('USD'),
    billingPeriod: text('billing_period').notNull().default('monthly'),
    nextExpectedAt: timestamp('next_expected_at', { withTimezone: true }),
    pausedAt: timestamp('paused_at', { withTimezone: true }),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (t) => ({
    userIdIdx: index('subscriptions_user_id_idx').on(t.userId),
    statusIdx: index('subscriptions_status_idx').on(t.status),
    nextExpectedIdx: index('subscriptions_next_expected_idx').on(t.nextExpectedAt),
  }),
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
