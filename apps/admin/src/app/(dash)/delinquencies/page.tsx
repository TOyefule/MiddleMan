'use client';

import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton, formatCents, formatDate } from '@middleman/ui';

export default function DelinquenciesPage() {
  const { data: bills, isLoading } = trpc.admin.delinquencies.list.useQuery();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Delinquencies</h1>
      <p className="text-muted-foreground">Bills that are past due or uncollectible. Manual ops review at day 14.</p>

      {isLoading && <Skeleton className="h-64" />}

      {bills && bills.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No delinquent bills. All clear.</p>
          </CardContent>
        </Card>
      )}

      {bills && bills.length > 0 && (
        <div className="space-y-3">
          {bills.map((bill) => (
            <Card key={bill.id}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <div>
                  <CardTitle className="text-sm font-mono">{bill.userId}</CardTitle>
                  <p className="text-xs text-muted-foreground">Due {formatDate(bill.dueDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatCents(bill.totalCents)}</span>
                  <Badge variant={bill.status === 'past_due' ? 'warning' : 'destructive'}>
                    {bill.status}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
