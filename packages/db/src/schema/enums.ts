import { pgEnum } from 'drizzle-orm/pg-core';

export const userStatus = pgEnum('user_status', [
  'pending_verification',
  'active',
  'suspended',
  'closed',
]);

export const saasTier = pgEnum('saas_tier', ['lite', 'plus', 'pro', 'overage']);

export const kycLevel = pgEnum('kyc_level', ['none', 'light', 'full']);
export const kycStatus = pgEnum('kyc_status', [
  'not_started',
  'pending',
  'verified',
  'failed',
  'manual_review',
]);

export const paymentMethodType = pgEnum('payment_method_type', ['ach', 'card']);

export const subscriptionSource = pgEnum('subscription_source', ['manual', 'plaid', 'direct']);
export const subscriptionStatus = pgEnum('subscription_status', [
  'tracking_only',
  'active',
  'paused',
  'canceled',
]);

export const virtualCardStatus = pgEnum('virtual_card_status', [
  'pending',
  'active',
  'inactive',
  'canceled',
]);

export const chargeStatus = pgEnum('charge_status', [
  'pending',
  'authorized',
  'captured',
  'declined',
  'refunded',
  'disputed',
]);

export const billStatus = pgEnum('bill_status', [
  'draft',
  'open',
  'paid',
  'past_due',
  'uncollectible',
  'void',
]);

export const billLineItemType = pgEnum('bill_line_item_type', [
  'passthrough',
  'saas_fee',
  'late_fee',
  'overage_fee',
  'adjustment',
  'refund',
]);

export const ledgerAccount = pgEnum('ledger_account', [
  'asset_float',
  'asset_receivable',
  'liability_user',
  'liability_provider_owed',
  'revenue_saas',
  'revenue_late',
  'revenue_overage',
  'expense_fees',
  'expense_writeoff',
]);

export const dunningStatus = pgEnum('dunning_status', [
  'scheduled',
  'attempted',
  'succeeded',
  'failed',
  'abandoned',
]);

export const notificationChannel = pgEnum('notification_channel', [
  'email',
  'sms',
  'web_push',
  'slack',
]);

export const notificationStatus = pgEnum('notification_status', [
  'queued',
  'sent',
  'delivered',
  'bounced',
  'failed',
]);

export const adminRole = pgEnum('admin_role', ['ops', 'finance', 'eng', 'support']);

export const webhookSource = pgEnum('webhook_source', [
  'stripe',
  'stripe_issuing',
  'plaid',
  'clerk',
  'twilio',
  'resend',
]);
