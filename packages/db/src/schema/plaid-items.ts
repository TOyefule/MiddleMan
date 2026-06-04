import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Plaid Items
 *
 * Maps Plaid item IDs to users and stores encrypted access tokens.
 * One user can have multiple Plaid items (multiple bank accounts).
 */
export const plaidItems = pgTable(
  'plaid_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    itemId: text('item_id').notNull(), // Plaid's item ID (public identifier)
    accessToken: text('access_token').notNull(), // Encrypted Plaid access token
    institutionId: text('institution_id'), // Plaid institution ID (e.g., 'ins_1')
    institutionName: text('institution_name'), // Human-readable name (e.g., 'Chase Bank')
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (t) => ({
    userIdIdx: index('plaid_items_user_id_idx').on(t.userId),
    itemIdIdx: uniqueIndex('plaid_items_item_id_idx').on(t.itemId),
  }),
);

export type PlaidItem = typeof plaidItems.$inferSelect;
export type NewPlaidItem = typeof plaidItems.$inferInsert;
