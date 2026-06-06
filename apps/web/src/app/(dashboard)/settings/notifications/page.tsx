'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@middleman/ui';

/**
 * Notification preferences page.
 * Users can opt-in/opt-out of notifications per category per channel.
 * 
 * Integration with Phase 4: Uses notification_preferences table
 * Categories: billing, dunning, security, sub_activity, marketing
 * Channels: email, sms
 */
export default function NotificationsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Notification Preferences</h1>
        <p className="text-muted-foreground">Control which emails and texts you receive from MiddleMan.</p>
      </div>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Choose which email updates you'd like to receive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationPreference
            title="Billing Updates"
            description="Bill issued, payment received, charges adjusted, fees waived"
            defaultEnabled={true}
          />
          <NotificationPreference
            title="Payment Reminders"
            description="Payment failures, past due notices, payment retries"
            defaultEnabled={true}
          />
          <NotificationPreference
            title="Security Alerts"
            description="Account changes, verification needed, suspicious activity"
            defaultEnabled={true}
          />
          <NotificationPreference
            title="Subscription Activity"
            description="New subscriptions added, cancellations, price changes"
            defaultEnabled={true}
          />
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Text Message Notifications</CardTitle>
          <CardDescription>Choose which SMS updates you'd like to receive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationPreference
            title="Billing Updates"
            description="Payment received, charges adjusted, important billing info"
            defaultEnabled={true}
          />
          <NotificationPreference
            title="Payment Reminders"
            description="Payment failures, past due notices"
            defaultEnabled={true}
          />
          <NotificationPreference
            title="Security Alerts"
            description="Account changes, verification needed"
            defaultEnabled={true}
          />
        </CardContent>
      </Card>

      {/* Future Enhancement Note */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>Coming soon:</strong> You'll be able to customize these preferences here. For now, preferences are managed through your account settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationPreference({
  title,
  description,
  defaultEnabled,
}: {
  title: string;
  description: string;
  defaultEnabled: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-3 border-b last:border-0">
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center">
        {/* Placeholder for toggle - Phase 7 will implement actual toggle */}
        <span className="text-xs text-muted-foreground">
          {defaultEnabled ? '✓ On' : '✗ Off'}
        </span>
      </div>
    </div>
  );
}
