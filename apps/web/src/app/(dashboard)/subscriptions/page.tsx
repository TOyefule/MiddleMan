'use client';

import { trpc } from '@/lib/trpc';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Skeleton,
  formatCents,
} from '@middleman/ui';

export default function SubscriptionsPage() {
  const { data: subs, isLoading } = trpc.subscriptions.list.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">Manage all your recurring payments in one place.</p>
        </div>
        <Button>Add subscription</Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      {subs && subs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No subscriptions yet. Add one manually or connect your bank to auto-detect them.
            </p>
          </CardContent>
        </Card>
      )}

      {subs && subs.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subs.map((sub) => (
            <Card key={sub.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {sub.rawMerchantName ?? 'Unknown provider'}
                  </CardTitle>
                  <StatusBadge status={sub.status} />
                </div>
                <CardDescription>
                  {sub.expectedAmountCents
                    ? `${formatCents(sub.expectedAmountCents)} / ${sub.billingPeriod}`
                    : sub.billingPeriod}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {sub.status === 'active' && (
                    <Button variant="outline" size="sm">
                      Pause
                    </Button>
                  )}
                  {sub.status === 'paused' && (
                    <Button variant="outline" size="sm">
                      Resume
                    </Button>
                  )}
                  <Button variant="destructive" size="sm">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' }> = {
    tracking_only: { label: 'Tracking', variant: 'secondary' },
    active: { label: 'Active', variant: 'success' },
    paused: { label: 'Paused', variant: 'warning' },
    canceled: { label: 'Canceled', variant: 'destructive' },
  };
  const entry = map[status] ?? { label: status, variant: 'secondary' as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}
