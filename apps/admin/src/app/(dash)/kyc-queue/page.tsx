'use client';

import { trpc } from '@/lib/trpc';
import { Card, CardContent, Badge, Skeleton } from '@middleman/ui';

export default function KycQueuePage() {
  const { data: profiles, isLoading } = trpc.admin.kycQueue.pending.useQuery();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">KYC Review Queue</h1>
      <p className="text-muted-foreground">Profiles requiring manual review after Stripe Identity check.</p>

      {isLoading && <Skeleton className="h-64" />}
      {profiles && profiles.length === 0 && (
        <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground">Queue empty.</p></CardContent></Card>
      )}
      {profiles && profiles.length > 0 && (
        <div className="space-y-3">
          {profiles.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-mono text-sm">{p.userId}</p>
                  <p className="text-xs text-muted-foreground">{p.legalName ?? 'Name not provided'}</p>
                </div>
                <Badge variant="warning">Manual review</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
