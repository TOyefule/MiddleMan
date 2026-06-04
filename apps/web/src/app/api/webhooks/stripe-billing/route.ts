import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getDb, schema, eq } from '@middleman/db';
import { inngest } from '@middleman/jobs';
import * as paymentCollection from '@middleman/api/services/payment-collection';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Sig failed' }, { status: 400 });
  }

  // Idempotency check
  const db = getDb();
  const existing = await db
    .select({ id: schema.webhookEvents.id })
    .from(schema.webhookEvents)
    .where(eq(schema.webhookEvents.externalId, event.id))
    .limit(1);
  if (existing.length > 0) return NextResponse.json({ received: true });

  await db.insert(schema.webhookEvents).values({
    source: 'stripe',
    externalId: event.id,
    type: event.type,
    payload: event.data.object as Record<string, unknown>,
    signatureVerified: true,
  });

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const billId = pi.metadata?.billId;
      if (billId) {
        const amountCents = pi.amount;
        try {
          await paymentCollection.handlePaymentSuccess({
            billId,
            paymentIntentId: pi.id,
            amountCents,
          });
          // Emit event for payment-collection job's waitForEvent to pick up
          await inngest.send({
            name: 'payment_intent.succeeded',
            data: { billId, paymentIntentId: pi.id, amountCents },
          });
          // Also emit for notifications to pick up
          await inngest.send({
            name: 'bill.payment.succeeded',
            data: { billId, amountCents },
          });
        } catch (err) {
          console.error(`Error handling payment success for bill ${billId}:`, err);
        }
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const billId = pi.metadata?.billId;
      if (billId) {
        const failureCode = pi.last_payment_error?.code ?? 'unknown';
        const failureMessage = pi.last_payment_error?.message ?? 'Payment failed';
        try {
          await paymentCollection.handlePaymentFailure({
            billId,
            paymentIntentId: pi.id,
            failureCode,
            failureMessage,
          });
          // Emit event for payment-collection job's waitForEvent to pick up
          await inngest.send({
            name: 'payment_intent.payment_failed',
            data: { billId, paymentIntentId: pi.id, failureCode, failureMessage },
          });
        } catch (err) {
          console.error(`Error handling payment failure for bill ${billId}:`, err);
        }
      }
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const billId = invoice.metadata?.middleman_bill_id;
      if (billId) {
        await db
          .update(schema.bills)
          .set({ status: 'paid', paidAt: new Date() })
          .where(eq(schema.bills.id, billId));
      }
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const billId = invoice.metadata?.middleman_bill_id;
      if (billId) {
        await inngest.send({
          name: 'bill.payment.failed',
          data: {
            billId,
            attemptNo: (invoice.attempt_count ?? 0) + 1,
            failureCode: invoice.last_finalization_error?.code ?? 'unknown',
          },
        });
      }
      break;
    }
    case 'identity.verification_session.verified': {
      const session = event.data.object as Stripe.Identity.VerificationSession;
      const userId = session.metadata?.user_id;
      if (userId) {
        const [profile] = await db
          .update(schema.kycProfiles)
          .set({ status: 'verified', level: 'full', verifiedAt: new Date() })
          .where(eq(schema.kycProfiles.userId, userId))
          .returning();

        if (profile) {
          await inngest.send({
            name: 'kyc.verified',
            data: {
              userId,
              kycProfileId: profile.id,
              verificationLevel: 'full',
            },
          });
        }
      }
      break;
    }
    case 'identity.verification_session.requires_input': {
      const session = event.data.object as Stripe.Identity.VerificationSession;
      const userId = session.metadata?.user_id;
      if (userId) {
        const failureReason = session.last_error?.reason ?? 'unknown_error';
        const [profile] = await db
          .update(schema.kycProfiles)
          .set({ status: 'failed', failureReason })
          .where(eq(schema.kycProfiles.userId, userId))
          .returning();

        if (profile) {
          await inngest.send({
            name: 'kyc.failed',
            data: {
              userId,
              kycProfileId: profile.id,
              failureReason,
            },
          });
        }
      }
      break;
    }
  }

  await db
    .update(schema.webhookEvents)
    .set({ processedAt: new Date() })
    .where(eq(schema.webhookEvents.externalId, event.id));

  return NextResponse.json({ received: true });
}
