import { getDb, schema, eq, and } from '@middleman/db';
import * as issuing from './issuing';
import * as notifications from './notifications';
import { NotFoundError } from '../lib/errors';

export async function requestCancellation(input: { userId: string; subscriptionId: string }) {
  const db = getDb();
  const [sub] = await db
    .select()
    .from(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.id, input.subscriptionId),
        eq(schema.subscriptions.userId, input.userId),
      ),
    )
    .limit(1);
  if (!sub) throw new NotFoundError('Subscription');

  await issuing.pauseSubscriptionCard({
    userId: input.userId,
    subscriptionId: input.subscriptionId,
  });

  const [req] = await db
    .insert(schema.cancellationRequests)
    .values({
      userId: input.userId,
      subscriptionId: input.subscriptionId,
      cardPausedAt: new Date(),
    })
    .returning();

  await notifications.dispatch({
    userId: input.userId,
    template: 'cancellation_playbook',
    data: { subscriptionId: input.subscriptionId },
  });

  if (req) {
    await db
      .update(schema.cancellationRequests)
      .set({ playbookSentAt: new Date() })
      .where(eq(schema.cancellationRequests.id, req.id));
  }

  return req;
}

export async function confirmCanceled(input: { userId: string; requestId: string }) {
  const db = getDb();
  const [req] = await db
    .select()
    .from(schema.cancellationRequests)
    .where(
      and(
        eq(schema.cancellationRequests.id, input.requestId),
        eq(schema.cancellationRequests.userId, input.userId),
      ),
    )
    .limit(1);
  if (!req) throw new NotFoundError('Cancellation request');

  await db.transaction(async (tx) => {
    await tx
      .update(schema.cancellationRequests)
      .set({ userConfirmedCanceledAt: new Date() })
      .where(eq(schema.cancellationRequests.id, req.id));
    await tx
      .update(schema.subscriptions)
      .set({ status: 'canceled', canceledAt: new Date() })
      .where(eq(schema.subscriptions.id, req.subscriptionId));
  });
  return { ok: true };
}
