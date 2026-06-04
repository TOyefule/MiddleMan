import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  customType,
} from 'drizzle-orm/pg-core';
import { kycLevel, kycStatus } from './enums';
import { users } from './users';

/**
 * KMS-encrypted text. The DB stores ciphertext (bytea) base64-encoded as text.
 * Application layer envelope-encrypts plaintext through AWS KMS before insert,
 * and decrypts on read in services that have IAM permission.
 */
const encryptedText = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'text';
  },
});

export const kycProfiles = pgTable(
  'kyc_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    level: kycLevel('level').notNull().default('none'),
    status: kycStatus('status').notNull().default('not_started'),
    legalName: text('legal_name'),
    // ── KMS-encrypted (envelope-encrypted via AWS KMS, ciphertext stored) ──
    dobCiphertext: encryptedText('dob_ciphertext'),
    ssnLast4Ciphertext: encryptedText('ssn_last4_ciphertext'),
    addressLine1Ciphertext: encryptedText('address_line1_ciphertext'),
    addressLine2Ciphertext: encryptedText('address_line2_ciphertext'),
    cityCiphertext: encryptedText('city_ciphertext'),
    stateCiphertext: encryptedText('state_ciphertext'),
    postalCodeCiphertext: encryptedText('postal_code_ciphertext'),
    countryCode: text('country_code').notNull().default('US'),
    stripeIdentitySessionId: text('stripe_identity_session_id'),
    stripeCardholderId: text('stripe_cardholder_id'),
    failureReason: text('failure_reason'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (t) => ({
    userIdIdx: index('kyc_profiles_user_id_idx').on(t.userId),
    statusIdx: index('kyc_profiles_status_idx').on(t.status),
  }),
);

export type KycProfile = typeof kycProfiles.$inferSelect;
export type NewKycProfile = typeof kycProfiles.$inferInsert;
