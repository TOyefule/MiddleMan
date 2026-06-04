import { getDb, schema, eq, and } from '@middleman/db';
import { Resend } from 'resend';
import twilio from 'twilio';
import type { Notification, NotificationPreference } from '@middleman/db/types';

let resend: Resend | undefined;
let twilioClient: ReturnType<typeof twilio> | undefined;

function getResend(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

function getTwilio() {
  if (!twilioClient) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
  }
  return twilioClient;
}

export type DispatchInput = {
  userId: string;
  template: NotificationTemplate;
  data: Record<string, unknown>;
};

export type NotificationTemplate =
  | 'welcome'
  | 'kyc_required'
  | 'kyc_verified'
  | 'subscription_added'
  | 'subscription_paused'
  | 'cancellation_playbook'
  | 'bill_issued'
  | 'bill_paid'
  | 'payment_failed_retry'
  | 'payment_failed_final'
  | 'card_paused';

const TEMPLATE_CATEGORY: Record<NotificationTemplate, string> = {
  welcome: 'security',
  kyc_required: 'security',
  kyc_verified: 'security',
  subscription_added: 'sub_activity',
  subscription_paused: 'sub_activity',
  cancellation_playbook: 'sub_activity',
  bill_issued: 'billing',
  bill_paid: 'billing',
  payment_failed_retry: 'dunning',
  payment_failed_final: 'dunning',
  card_paused: 'sub_activity',
};

/**
 * Single entrypoint for sending a notification. Reads the user's preferences and
 * fans out to enabled channels. Each channel attempt is recorded as one row in
 * `notifications` so we can audit deliveries and surface bounces in the admin app.
 */
export async function dispatch(input: DispatchInput) {
  const db = getDb();
  const category = TEMPLATE_CATEGORY[input.template];

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, input.userId))
    .limit(1);
  if (!user) return;

  const prefs = (await db
    .select()
    .from(schema.notificationPreferences)
    .where(eq(schema.notificationPreferences.userId, input.userId))) as NotificationPreference[];

  const isEnabled = (channel: NotificationPreference['channel']): boolean => {
    const pref = prefs.find((p) => p.channel === channel && p.category === category);
    return pref?.enabled ?? defaultEnabled(channel, category);
  };

  if (isEnabled('email')) await sendEmail(user.email, input.template, input.data, input.userId);
  if (isEnabled('sms') && user.phone)
    await sendSms(user.phone, input.template, input.data, input.userId);
  // web_push + slack channels: wired in later milestones
}

function defaultEnabled(channel: string, category: string): boolean {
  // Security and billing default to opt-out; marketing defaults to opt-in.
  if (category === 'marketing') return false;
  if (channel === 'sms' && category === 'sub_activity') return false;
  return true;
}

async function sendEmail(
  to: string,
  template: NotificationTemplate,
  data: Record<string, unknown>,
  userId: string,
): Promise<void> {
  const db = getDb();
  const [row] = await db
    .insert(schema.notifications)
    .values({ userId, channel: 'email', template, payload: data, status: 'queued' })
    .returning();
  try {
    const res = await getResend().emails.send({
      from: 'MiddleMan <hello@middleman.app>',
      to,
      subject: subjectFor(template, data),
      text: textFor(template, data),
    });
    await db
      .update(schema.notifications)
      .set({ status: 'sent', externalId: res.data?.id, sentAt: new Date() })
      .where(eq(schema.notifications.id, row!.id));
  } catch (err) {
    await db
      .update(schema.notifications)
      .set({ status: 'failed', failureMessage: String(err) })
      .where(eq(schema.notifications.id, row!.id));
  }
}

async function sendSms(
  to: string,
  template: NotificationTemplate,
  data: Record<string, unknown>,
  userId: string,
): Promise<void> {
  const db = getDb();
  const [row] = await db
    .insert(schema.notifications)
    .values({ userId, channel: 'sms', template, payload: data, status: 'queued' })
    .returning();
  try {
    const msg = await getTwilio().messages.create({
      from: process.env.TWILIO_FROM_NUMBER,
      to,
      body: textFor(template, data),
    });
    await db
      .update(schema.notifications)
      .set({ status: 'sent', externalId: msg.sid, sentAt: new Date() })
      .where(eq(schema.notifications.id, row!.id));
  } catch (err) {
    await db
      .update(schema.notifications)
      .set({ status: 'failed', failureMessage: String(err) })
      .where(eq(schema.notifications.id, row!.id));
  }
}

function subjectFor(template: NotificationTemplate, _data: Record<string, unknown>): string {
  switch (template) {
    case 'welcome':
      return 'Welcome to MiddleMan';
    case 'bill_issued':
      return 'Your MiddleMan bill is ready';
    case 'payment_failed_retry':
      return 'We couldn’t collect your bill — we’ll retry';
    case 'payment_failed_final':
      return 'Action needed: your MiddleMan bill is past due';
    case 'cancellation_playbook':
      return 'How to finish canceling your subscription';
    default:
      return 'MiddleMan update';
  }
}

function textFor(template: NotificationTemplate, _data: Record<string, unknown>): string {
  // Plain-text fallback. Rich react-email templates live in packages/ui/emails.
  return `MiddleMan: ${template} — see app for details.`;
}
