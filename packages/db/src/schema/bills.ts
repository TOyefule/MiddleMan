import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { billStatus, billLineItemType } from './enums';
import { users } from './users';
import { charges } from './charges';

export const bills = pgTable(
  'bills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    passthroughSubtotalCents: integer('passthrough_subtotal_cents').notNull().default(0),
    saasFeeCents: integer('saas_fee_cents').notNull().default(0),
    overageFeeCents: integer('overage_fee_cents').notNull().default(0),
    lateFeeCents: integer('late_fee_cents').notNull().default(0),
    adjustmentsCents: integer('adjustments_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull().default(0),
    currency: text('currency').notNull().default('USD'),
    status: billStatus('status').notNull().default('draft'),
    stripeInvoiceId: text('stripe_invoice_id'),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (t) => ({
    userIdIdx: index('bills_user_id_idx').on(t.userId),
    statusIdx: index('bills_status_idx').on(t.status),
    dueDateIdx: index('bills_due_date_idx').on(t.dueDate),
  }),
);

export const billLineItems = pgTable(
  'bill_line_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    billId: uuid('bill_id')
      .notNull()
      .references(() => bills.id, { onDelete: 'cascade' }),
    type: billLineItemType('type').notNull(),
    chargeId: uuid('charge_id').references(() => charges.id),
    description: text('description').notNull(),
    amountCents: integer('amount_cents').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    billIdIdx: index('bill_line_items_bill_id_idx').on(t.billId),
  }),
);

export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;
export type BillLineItem = typeof billLineItems.$inferSelect;
