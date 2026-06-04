import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { ledgerAccount } from './enums';
import { bills } from './bills';
import { charges } from './charges';

/**
 * Double-entry append-only ledger. Every financial event writes a paired set of
 * (debit, credit) rows that sum to zero. Never UPDATE/DELETE — reversals are new entries.
 */
export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    transactionId: uuid('transaction_id').notNull(), // groups paired entries
    account: ledgerAccount('account').notNull(),
    debitCents: integer('debit_cents').notNull().default(0),
    creditCents: integer('credit_cents').notNull().default(0),
    currency: text('currency').notNull().default('USD'),
    billId: uuid('bill_id').references(() => bills.id),
    chargeId: uuid('charge_id').references(() => charges.id),
    description: text('description').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    transactionIdIdx: index('ledger_entries_transaction_id_idx').on(t.transactionId),
    accountIdx: index('ledger_entries_account_idx').on(t.account),
    occurredAtIdx: index('ledger_entries_occurred_at_idx').on(t.occurredAt),
  }),
);

export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type NewLedgerEntry = typeof ledgerEntries.$inferInsert;
