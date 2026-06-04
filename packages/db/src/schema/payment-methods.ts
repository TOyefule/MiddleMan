import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { paymentMethodType } from './enums';
import { users } from './users';

export const paymentMethods = pgTable(
  'payment_methods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: paymentMethodType('type').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    isFallback: boolean('is_fallback').notNull().default(false),
    stripePaymentMethodId: text('stripe_payment_method_id'),
    plaidAccountId: text('plaid_account_id'),
    last4: text('last4'),
    brand: text('brand'),
    bankName: text('bank_name'),
    nickname: text('nickname'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (t) => ({
    userIdIdx: index('payment_methods_user_id_idx').on(t.userId),
  }),
);

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;
