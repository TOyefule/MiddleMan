import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { virtualCardStatus } from './enums';
import { users } from './users';
import { subscriptions } from './subscriptions';

export const virtualCards = pgTable(
  'virtual_cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    stripeCardId: text('stripe_card_id').notNull(),
    stripeCardholderId: text('stripe_cardholder_id').notNull(),
    last4: text('last4'),
    brand: text('brand'),
    status: virtualCardStatus('status').notNull().default('pending'),
    // Stripe Issuing spending_controls payload, mirrored for audit
    spendingCaps: jsonb('spending_caps'),
    // Denormalized per-card cap for the Edge auth-webhook fast path
    perCycleCapCents: integer('per_cycle_cap_cents'),
    currentCycleSpentCents: integer('current_cycle_spent_cents').notNull().default(0),
    cycleStartedAt: timestamp('cycle_started_at', { withTimezone: true }),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (t) => ({
    stripeCardIdIdx: uniqueIndex('virtual_cards_stripe_card_id_idx').on(t.stripeCardId),
    subscriptionIdIdx: index('virtual_cards_subscription_id_idx').on(t.subscriptionId),
    userIdIdx: index('virtual_cards_user_id_idx').on(t.userId),
  }),
);

export type VirtualCard = typeof virtualCards.$inferSelect;
export type NewVirtualCard = typeof virtualCards.$inferInsert;
