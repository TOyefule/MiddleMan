import Stripe from 'stripe';

let stripeClient: Stripe | undefined;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not set');
    stripeClient = new Stripe(key, { apiVersion: '2024-09-30.acacia' });
  }
  return stripeClient;
}

export type StripeIssuingAuthorization = Stripe.Issuing.Authorization;
export type StripeIssuingTransaction = Stripe.Issuing.Transaction;
export type StripeIssuingCard = Stripe.Issuing.Card;
export type StripeInvoice = Stripe.Invoice;
