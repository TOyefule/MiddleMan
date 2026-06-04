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
import { chargeStatus } from './enums';
import { users } from './users';
import { subscriptions } from './subscriptions';
import { virtualCards } from './virtual-cards';

export const charges = pgTable(
  'charges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id),
    virtualCardId: uuid('virtual_card_id')
      .notNull()
      .references(() => virtualCards.id),
    stripeAuthorizationId: text('stripe_authorization_id'),
    stripeTransactionId: text('stripe_transaction_id'),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull().default('USD'),
    merchantData: jsonb('merchant_data'),
    status: chargeStatus('status').notNull().default('pending'),
    declineReason: text('decline_reason'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (t) => ({
    userIdIdx: index('charges_user_id_idx').on(t.userId),
    subscriptionIdIdx: index('charges_subscription_id_idx').on(t.subscriptionId),
    stripeAuthIdIdx: uniqueIndex('charges_stripe_auth_id_idx')
      .on(t.stripeAuthorizationId)
      .where(sql`${t.stripeAuthorizationId} is not null`),
    occurredAtIdx: index('charges_occurred_at_idx').on(t.occurredAt),
  }),
);

export type Charge = typeof charges.$inferSelect;
export type NewCharge = typeof charges.$inferInsert;
