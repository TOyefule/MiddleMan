import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { webhookSource } from './enums';

/**
 * Idempotency anchor for every incoming webhook. Inserts are unique on
 * (source, external_id). Duplicate replays return early without re-processing.
 */
export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: webhookSource('source').notNull(),
    externalId: text('external_id').notNull(),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull(),
    signatureVerified: boolean('signature_verified').notNull().default(false),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    error: text('error'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sourceExternalIdIdx: uniqueIndex('webhook_events_source_external_id_idx').on(
      t.source,
      t.externalId,
    ),
    typeIdx: index('webhook_events_type_idx').on(t.type),
    receivedAtIdx: index('webhook_events_received_at_idx').on(t.receivedAt),
  }),
);

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
