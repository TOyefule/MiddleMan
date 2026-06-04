'use client';

import { trpc } from '@/lib/trpc';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Skeleton,
  formatCents,
  formatDate,
} from '@middleman/ui';

export default function BillsPage() {
  const { data: bills, isLoading } = trpc.bills.list.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bills</h1>
        <p className="text-muted-foreground">Your consolidated monthly statements.</p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      )}

      {bills && bills.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No bills yet. Your first bill will appear after your billing cycle closes.</p>
          </CardContent>
        </Card>
      )}

      {bills && bills.length > 0 && (
        <div className="space-y-4">
          {bills.map((bill) => (
            <Card key={bill.id}>
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <div>
                  <CardTitle className="text-base">
                    {formatDate(bill.periodStart)} &ndash; {formatDate(bill.periodEnd)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Due {formatDate(bill.dueDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">{formatCents(bill.totalCents)}</span>
                  <BillStatusBadge status={bill.status} />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function BillStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'default' }> = {
    draft: { label: 'Draft', variant: 'secondary' },
    open: { label: 'Open', variant: 'default' },
    paid: { label: 'Paid', variant: 'success' },
    past_due: { label: 'Past due', variant: 'warning' },
    uncollectible: { label: 'Uncollectible', variant: 'destructive' },
    void: { label: 'Void', variant: 'secondary' },
  };
  const entry = map[status] ?? { label: status, variant: 'secondary' as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}
