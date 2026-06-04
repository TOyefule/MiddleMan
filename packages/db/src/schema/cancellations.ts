import { pgTable, uuid, timestamp, text, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { subscriptions } from './subscriptions';

export const cancellationRequests = pgTable(
  'cancellation_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    cardPausedAt: timestamp('card_paused_at', { withTimezone: true }),
    playbookSentAt: timestamp('playbook_sent_at', { withTimezone: true }),
    followupSentAt: timestamp('followup_sent_at', { withTimezone: true }),
    userConfirmedCanceledAt: timestamp('user_confirmed_canceled_at', { withTimezone: true }),
    notes: text('notes'),
  },
  (t) => ({
    userIdIdx: index('cancellation_requests_user_id_idx').on(t.userId),
    subscriptionIdIdx: index('cancellation_requests_subscription_id_idx').on(t.subscriptionId),
  }),
);

export type CancellationRequest = typeof cancellationRequests.$inferSelect;
