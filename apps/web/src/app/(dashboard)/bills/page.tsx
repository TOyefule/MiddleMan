'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Skeleton,
  formatCents,
  formatDate,
} from '@middleman/ui';

export default function BillsPage() {
  const router = useRouter();
  const { data: bills, isLoading } = trpc.bills.list.useQuery();
  const { data: preview } = trpc.bills.preview.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Your consolidated monthly statements and payment history.</p>
      </div>

      {/* Current Bill Preview */}
      {preview && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Current Bill</CardTitle>
            <CardDescription className="text-blue-700">
              {formatDate(preview.periodStart)} – {formatDate(preview.periodEnd)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{formatCents(preview.totalCents)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="text-xl font-semibold">{formatDate(preview.dueDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <BillStatusBadge status={preview.status} />
              </div>
            </div>
            <Button 
              onClick={() => router.push('/bills/current')}
              className="w-full"
            >
              View Details & Pay
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bills History */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Bill History</h2>
        
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
          <div className="space-y-3">
            {bills.map((bill) => (
              <Card 
                key={bill.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/bills/${bill.id}`)}
              >
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">
                        {formatDate(bill.periodStart)} – {formatDate(bill.periodEnd)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Due {formatDate(bill.dueDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">{formatCents(bill.totalCents)}</p>
                      <div className="mt-1">
                        <BillStatusBadge status={bill.status} />
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
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
