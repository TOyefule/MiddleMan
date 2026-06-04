import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { adminRole } from './enums';

export const admins = pgTable(
  'admins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkUserId: text('clerk_user_id').notNull(),
    email: text('email').notNull(),
    role: adminRole('role').notNull().default('ops'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (t) => ({
    clerkUserIdIdx: uniqueIndex('admins_clerk_user_id_idx').on(t.clerkUserId),
    emailIdx: uniqueIndex('admins_email_idx').on(t.email),
  }),
);

/**
 * Append-only audit log. Never UPDATE or DELETE.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id'),
    actorAdminId: uuid('actor_admin_id'),
    actorType: text('actor_type').notNull(), // user | admin | system | webhook
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    diff: jsonb('diff'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    actorUserIdIdx: index('audit_log_actor_user_id_idx').on(t.actorUserId),
    actorAdminIdIdx: index('audit_log_actor_admin_id_idx').on(t.actorAdminId),
    targetIdx: index('audit_log_target_idx').on(t.targetType, t.targetId),
    atIdx: index('audit_log_at_idx').on(t.at),
  }),
);

export type Admin = typeof admins.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
