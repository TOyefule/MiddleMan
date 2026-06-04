import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  smallint,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { userStatus, saasTier } from './enums';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkUserId: text('clerk_user_id').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    status: userStatus('status').notNull().default('pending_verification'),
    saasTier: saasTier('saas_tier').notNull().default('lite'),
    billingDay: smallint('billing_day').notNull().default(1),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    // Denormalized for the Edge auth webhook fast path. Updated by Inngest worker.
    currentPeriodSpentCents: integer('current_period_spent_cents').notNull().default(0),
    monthlyCapCents: integer('monthly_cap_cents').notNull().default(50000),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (t) => ({
    clerkUserIdIdx: uniqueIndex('users_clerk_user_id_idx').on(t.clerkUserId),
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
    statusIdx: index('users_status_idx').on(t.status),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
