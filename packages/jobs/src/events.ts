/**
 * Strongly typed Inngest event registry. Every place that sends an event imports
 * from here so the runtime can't drift from compile-time types.
 */
export type Events = {
  'charge.authorized': {
    data: {
      userId: string;
      subscriptionId: string;
      virtualCardId: string;
      stripeAuthorizationId: string;
      amountCents: number;
      occurredAt: string;
    };
  };
  'charge.declined': {
    data: {
      userId: string;
      subscriptionId: string;
      virtualCardId: string;
      stripeAuthorizationId: string;
      amountCents: number;
      reason: string;
    };
  };
  'cycle.close.requested': {
    data: { userId: string; periodStart: string; periodEnd: string; dueDate: string };
  };
  'bill.issued': { data: { billId: string; userId: string; totalCents: number } };
  'bill.payment.failed': {
    data: { billId: string; attemptNo: number; failureCode: string };
  };
  'bill.payment.succeeded': {
    data: { billId: string; amountCents: number };
  };
  'bill.retry.requested': {
    data: { billId: string; userId: string; paymentMethodId?: string };
  };
  'payment_intent.succeeded': {
    data: { billId: string; paymentIntentId: string; amountCents: number };
  };
  'payment_intent.payment_failed': {
    data: { billId: string; paymentIntentId: string; failureCode: string; failureMessage: string };
  };
  'plaid.recurring.updated': { data: { itemId: string; userId: string } };
  'kyc.session.completed': { data: { stripeSessionId: string; userId: string } };
  'kyc.verified': {
    data: { userId: string; kycProfileId: string; verificationLevel: 'light' | 'full' };
  };
  'kyc.failed': {
    data: { userId: string; kycProfileId: string; failureReason: string };
  };
  'card.issued': {
    data: { userId: string; subscriptionId: string; virtualCardId: string };
  };
  'card.declined': {
    data: { userId: string; virtualCardId: string; reason: string };
  };
  'subscription.activated': {
    data: { userId: string; subscriptionId: string; virtualCardId: string };
  };
};
