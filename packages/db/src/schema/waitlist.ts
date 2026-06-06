import { pgTable, uuid, text, timestamp, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const waitlistProduct = pgEnum('waitlist_product', ['middleman', 'sentinel']);

export const waitlistEntries = pgTable(
  'waitlist_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    product: waitlistProduct('product').notNull(),
    email: text('email').notNull(),
    firstName: text('first_name'),
    tier: text('tier').notNull(),
    // MiddleMan-specific
    subCount: text('sub_count'),
    monthlySpend: text('monthly_spend'),
    // Sentinel-specific
    companyName: text('company_name'),
    role: text('role'),
    companySize: text('company_size'),
    saasToolCount: text('saas_tool_count'),
    biggestChallenge: text('biggest_challenge'),
    // Attribution
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    productEmailIdx: uniqueIndex('waitlist_product_email_idx').on(t.product, t.email),
    productTierIdx: index('waitlist_product_tier_idx').on(t.product, t.tier),
    createdAtIdx: index('waitlist_created_at_idx').on(t.createdAt),
  }),
);

export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type NewWaitlistEntry = typeof waitlistEntries.$inferInsert;
