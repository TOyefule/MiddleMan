import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  smallint,
  index,
} from 'drizzle-orm/pg-core';
import { dunningStatus } from './enums';
import { bills } from './bills';
import { paymentMethods } from './payment-methods';

export const dunningAttempts = pgTable(
  'dunning_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    billId: uuid('bill_id')
      .notNull()
      .references(() => bills.id, { onDelete: 'cascade' }),
    paymentMethodId: uuid('payment_method_id').references(() => paymentMethods.id),
    attemptNo: smallint('attempt_no').notNull(),
    method: text('method').notNull(), // smart_retry | fallback | manual | ops_review
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    amountCents: integer('amount_cents').notNull(),
    status: dunningStatus('status').notNull().default('scheduled'),
    failureCode: text('failure_code'),
    failureMessage: text('failure_message'),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (t) => ({
    billIdIdx: index('dunning_attempts_bill_id_idx').on(t.billId),
    statusIdx: index('dunning_attempts_status_idx').on(t.status),
    nextRetryIdx: index('dunning_attempts_next_retry_idx').on(t.nextRetryAt),
  }),
);

export type DunningAttempt = typeof dunningAttempts.$inferSelect;
export type NewDunningAttempt = typeof dunningAttempts.$inferInsert;
