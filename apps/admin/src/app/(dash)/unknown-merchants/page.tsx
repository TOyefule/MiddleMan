'use client';

import { trpc } from '@/lib/trpc';
import { Card, CardContent, Skeleton } from '@middleman/ui';

export default function UnknownMerchantsPage() {
  const { data: subs, isLoading } = trpc.admin.unknownMerchants.list.useQuery();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Unknown Merchants</h1>
      <p className="text-muted-foreground">
        Subscriptions that couldn't be matched to the provider catalog. Map them to a provider or create a new one.
      </p>

      {isLoading && <Skeleton className="h-64" />}
      {subs && subs.length === 0 && (
        <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground">All subscriptions matched.</p></CardContent></Card>
      )}
      {subs && subs.length > 0 && (
        <div className="space-y-3">
          {subs.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-semibold">{s.rawMerchantName ?? 'No name'}</p>
                  <p className="text-xs text-muted-foreground font-mono">{s.userId}</p>
                </div>
                <p className="text-sm text-muted-foreground">{s.source}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
