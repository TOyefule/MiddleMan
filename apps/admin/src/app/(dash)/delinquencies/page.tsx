'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton, Button, formatCents, formatDate } from '@middleman/ui';

export default function DelinquenciesPage() {
  const router = useRouter();
  const { data: bills, isLoading } = trpc.admin.delinquencies.list.useQuery();

  const handleViewDetails = (billId: string) => {
    router.push(`/delinquencies/${billId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Delinquencies</h1>
          <p className="text-muted-foreground">Bills past due or uncollectible. Manual ops review at day 14+.</p>
        </div>
        {bills && (
          <div className="text-right">
            <p className="text-2xl font-bold">{bills.length}</p>
            <p className="text-xs text-muted-foreground">delinquent bills</p>
          </div>
        )}
      </div>

      {isLoading && <Skeleton className="h-64" />}

      {bills && bills.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No delinquent bills. All clear. ✓</p>
          </CardContent>
        </Card>
      )}

      {bills && bills.length > 0 && (
        <div className="space-y-3">
          {bills.map((bill) => (
            <Card
              key={bill.billId}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleViewDetails(bill.billId)}
            >
              <CardHeader className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm">{bill.companyName}</CardTitle>
                      <Badge variant={bill.status === 'past_due' ? 'warning' : 'destructive'}>
                        {bill.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Due {formatDate(bill.dueDate)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold">{formatCents(bill.remainingCents)}</p>
                    <p className="text-xs text-muted-foreground">remaining</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="py-0 pb-4">
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground">Days Overdue</p>
                    <p className="font-semibold text-red-600">{bill.daysOverdue}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Attempts</p>
                    <p className="font-semibold">{bill.attemptCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Late Fee</p>
                    <p className="font-semibold text-orange-600">{formatCents(bill.lateFeeCents)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Attempt</p>
                    <p className="font-semibold">
                      {bill.lastAttemptAt ? formatDate(bill.lastAttemptAt) : 'Never'}
                    </p>
                  </div>
                </div>

                {bill.failureCode && (
                  <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded">
                    <strong>Latest error:</strong> {bill.failureCode}
                  </div>
                )}
              </CardContent>

              <div className="border-t px-6 py-3 flex justify-end">
                <Button size="sm" variant="outline">
                  View Details →
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
