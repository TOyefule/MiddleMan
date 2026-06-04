'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton, Button } from '@middleman/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { SubscriptionCardSetup } from '@/components/subscription-card-setup';

export default function SubscriptionDetailPage() {
  const params = useParams();
  const subscriptionId = params.id as string;

  const { data: subscriptions, isLoading } = trpc.subscriptions.list.useQuery();
  const subscription = subscriptions?.find((s) => s.id === subscriptionId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Subscription Not Found</h1>
        <Link href="/subscriptions">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Subscriptions
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/subscriptions">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Subscriptions
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold">{subscription.rawMerchantName || 'Unknown'}</h1>
        <p className="text-muted-foreground mt-2">Manage your card and payment settings.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Subscription Details */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-lg font-semibold">
                ${subscription.expectedAmountCents ? (subscription.expectedAmountCents / 100).toFixed(2) : '—'} /
                <span className="text-sm font-normal"> {subscription.billingPeriod}</span>
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                {subscription.status}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Source</p>
              <p className="font-medium capitalize mt-1">{subscription.source}</p>
            </div>

            {subscription.nextExpectedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Next Charge</p>
                <p className="font-medium mt-1">
                  {new Date(subscription.nextExpectedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Virtual Card Setup */}
        <SubscriptionCardSetup subscription={subscription} />
      </div>
    </div>
  );
}
