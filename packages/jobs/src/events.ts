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
  'plaid.recurring.updated': { data: { itemId: string } };
  'kyc.session.completed': { data: { stripeSessionId: string; userId: string } };
};
