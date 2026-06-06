'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Skeleton,
  formatCents,
  formatDate,
} from '@middleman/ui';

interface BillDetailPageProps {
  params: {
    billId: string;
  };
}

export default function BillDetailPage({ params }: BillDetailPageProps) {
  const router = useRouter();
  const { data: bill, isLoading } = trpc.bills.get.useQuery({ id: params.billId });
  const { data: paymentStatus } = trpc.bills.getPaymentStatus.useQuery({ billId: params.billId });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!bill) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Bill not found</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusColor: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'default'> = {
    paid: 'success',
    past_due: 'warning',
    uncollectible: 'destructive',
    open: 'default',
    draft: 'secondary',
    pending_collection: 'default',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bill Details</h1>
          <p className="text-muted-foreground">
            {formatDate(bill.periodStart)} – {formatDate(bill.periodEnd)}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      {/* Bill Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Status</CardTitle>
            <Badge variant={statusColor[bill.status] || 'secondary'}>
              {bill.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Billing Period</p>
            <p className="text-sm mt-1">
              {formatDate(bill.periodStart)} – {formatDate(bill.periodEnd)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Due Date</p>
            <p className="text-sm font-semibold mt-1">{formatDate(bill.dueDate)}</p>
          </div>
          {bill.paidAt && (
            <div>
              <p className="text-sm text-muted-foreground">Paid On</p>
              <p className="text-sm font-semibold text-green-600 mt-1">
                {formatDate(bill.paidAt)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      {bill.lineItems && bill.lineItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Charges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bill.lineItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{item.description || 'Charge'}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                  </div>
                  <p className="font-semibold">{formatCents(item.amountCents)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Amounts Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>{formatCents(bill.totalCents)}</span>
          </div>
          {bill.paidCents > 0 && (
            <div className="flex items-center justify-between text-green-600">
              <span>Paid</span>
              <span>-{formatCents(bill.paidCents)}</span>
            </div>
          )}
          {bill.status !== 'paid' && (
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="font-semibold">Amount Due</span>
              <span className="text-lg font-bold">
                {formatCents(Math.max(0, bill.totalCents - (bill.paidCents || 0)))}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Status */}
      {paymentStatus && paymentStatus.attempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {paymentStatus.attempts.map((attempt) => (
                <div
                  key={`${attempt.attemptNo}-${attempt.attemptedAt}`}
                  className="border-l-4 border-l-orange-500 bg-orange-50 p-3 rounded text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Attempt #{attempt.attemptNo}</span>
                    <Badge
                      variant={
                        attempt.status === 'succeeded'
                          ? 'success'
                          : attempt.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {attempt.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(attempt.attemptedAt)}
                  </p>
                  {attempt.failureCode && (
                    <p className="text-xs text-red-600 mt-1">
                      Error: {attempt.failureCode}
                      {attempt.failureMessage && ` — ${attempt.failureMessage}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment CTA */}
      {bill.status !== 'paid' && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900">Payment Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-green-700">
              Amount due: <span className="font-bold text-lg">{formatCents(Math.max(0, bill.totalCents - (bill.paidCents || 0)))}</span>
            </p>
            <Button
              className="w-full"
              onClick={() => router.push(`/bills/${bill.id}/pay`)}
            >
              Pay Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
