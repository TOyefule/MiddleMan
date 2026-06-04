'use client';

import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Skeleton } from '@middleman/ui';
import { ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SubscriptionsPage() {
  const { data: subscriptions, isLoading } = trpc.subscriptions.list.useQuery();
  const pauseMutation = trpc.subscriptions.pause.useMutation();
  const resumeMutation = trpc.subscriptions.resume.useMutation();

  const handlePause = async (id: string) => {
    try {
      await pauseMutation.mutateAsync({ id });
    } catch (err) {
      console.error('Failed to pause subscription:', err);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await resumeMutation.mutateAsync({ id });
    } catch (err) {
      console.error('Failed to resume subscription:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscriptions and virtual cards.
        </p>
      </div>

      {subscriptions && subscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">No subscriptions yet.</p>
            <Link href="/link-bank">
              <Button variant="outline">Link Your Bank Account</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subscriptions?.map((sub) => (
            <Card key={sub.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {sub.rawMerchantName || 'Unknown Subscription'}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                      {sub.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-semibold">
                      ${sub.expectedAmountCents ? (sub.expectedAmountCents / 100).toFixed(2) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Frequency</p>
                    <p className="font-semibold capitalize">{sub.billingPeriod}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Source</p>
                    <p className="font-semibold capitalize">{sub.source}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link href={`/subscriptions/${sub.id}`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2">
                      <ArrowRight className="w-4 h-4" />
                      Manage
                    </Button>
                  </Link>

                  {sub.status === 'active' ? (
                    <Button
                      variant="outline"
                      onClick={() => handlePause(sub.id)}
                      disabled={pauseMutation.isPending}
                    >
                      {pauseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Pause
                    </Button>
                  ) : sub.status === 'paused' ? (
                    <Button
                      variant="outline"
                      onClick={() => handleResume(sub.id)}
                      disabled={resumeMutation.isPending}
                    >
                      {resumeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Resume
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
