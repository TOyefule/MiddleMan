'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Skeleton,
  formatCents,
  formatDate,
  Input,
  Label,
  Textarea,
} from '@middleman/ui';
import { AdjustBillModal } from '../components/adjust-bill-modal';
import { WaiveFeModal } from '../components/waive-fee-modal';
import { MarkPastDueModal } from '../components/mark-past-due-modal';
import { ClearUncollectibleModal } from '../components/clear-uncollectible-modal';

interface DelinquencyDetailPageProps {
  params: {
    billId: string;
  };
}

export default function DelinquencyDetailPage({ params }: DelinquencyDetailPageProps) {
  const router = useRouter();
  const { data: delinquency, isLoading, refetch } = trpc.admin.delinquencies.get.useQuery({
    billId: params.billId,
  });

  const [activeModal, setActiveModal] = useState<
    'adjust' | 'waive-fee' | 'past-due' | 'clear-uncollectible' | null
  >(null);

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!delinquency) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Delinquency not found</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { bill, user, preview, dunningHistory } = delinquency;

  const statusColor = {
    past_due: 'warning',
    uncollectible: 'destructive',
  } as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{user.companyName}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Back to delinquencies
        </Button>
      </div>

      {/* Bill Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bill Status</CardTitle>
            <Badge variant={statusColor[bill.status]}>{bill.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Bill ID</p>
              <p className="font-mono text-sm">{bill.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Period</p>
              <p className="text-sm">
                {formatDate(bill.periodStart)} to {formatDate(bill.periodEnd)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className="text-sm font-semibold">{formatDate(bill.dueDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Days Overdue</p>
              <p className="text-sm font-semibold text-red-600">{bill.daysOverdue} days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amounts */}
      <Card>
        <CardHeader>
          <CardTitle>Amounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{formatCents(bill.totalCents)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Paid</span>
            <span className="font-semibold text-green-600">{formatCents(bill.paidCents)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Remaining</span>
            <span className="font-semibold text-red-600">{formatCents(bill.remainingCents)}</span>
          </div>
          {bill.lateFeeCents > 0 && (
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-muted-foreground">Late Fee</span>
              <span className="font-semibold text-orange-600">{formatCents(bill.lateFeeCents)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      {preview && preview.lineItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {preview.lineItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.displayName}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <span className="font-semibold">{item.displayAmount}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dunning History */}
      <Card>
        <CardHeader>
          <CardTitle>Dunning History ({dunningHistory.length} attempts)</CardTitle>
        </CardHeader>
        <CardContent>
          {dunningHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dunning attempts yet</p>
          ) : (
            <div className="space-y-3">
              {dunningHistory.map((attempt) => (
                <div
                  key={`${attempt.attemptNo}-${attempt.attemptedAt}`}
                  className="border-l-4 border-l-orange-500 bg-orange-50 p-3 rounded"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">Attempt #{attempt.attemptNo}</p>
                      <p className="text-xs text-muted-foreground">
                        {attempt.method.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        attempt.status === 'succeeded'
                          ? 'default'
                          : attempt.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {attempt.status}
                    </Badge>
                  </div>
                  <p className="text-xs mt-2 text-muted-foreground">
                    {formatDate(attempt.attemptedAt)}
                  </p>
                  {attempt.failureCode && (
                    <p className="text-xs text-red-600 mt-1">
                      <strong>Error:</strong> {attempt.failureCode}
                      {attempt.failureMessage && ` — ${attempt.failureMessage}`}
                    </p>
                  )}
                  {attempt.nextRetryAt && (
                    <p className="text-xs text-blue-600 mt-1">
                      Next retry: {formatDate(attempt.nextRetryAt)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => setActiveModal('adjust')}
              className="w-full"
            >
              Adjust Bill
            </Button>
            {bill.lateFeeCents > 0 && (
              <Button
                variant="outline"
                onClick={() => setActiveModal('waive-fee')}
                className="w-full"
              >
                Waive Fee
              </Button>
            )}
            {bill.status !== 'uncollectible' && (
              <Button
                variant="outline"
                onClick={() => setActiveModal('past-due')}
                className="w-full"
              >
                Mark Past Due
              </Button>
            )}
            {bill.status === 'uncollectible' && (
              <Button
                variant="outline"
                onClick={() => setActiveModal('clear-uncollectible')}
                className="w-full"
              >
                Clear & Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <AdjustBillModal
        billId={params.billId}
        isOpen={activeModal === 'adjust'}
        onClose={() => setActiveModal(null)}
        onSuccess={() => {
          setActiveModal(null);
          refetch();
        }}
      />
      <WaiveFeModal
        billId={params.billId}
        lateFeeCents={bill.lateFeeCents}
        isOpen={activeModal === 'waive-fee'}
        onClose={() => setActiveModal(null)}
        onSuccess={() => {
          setActiveModal(null);
          refetch();
        }}
      />
      <MarkPastDueModal
        billId={params.billId}
        isOpen={activeModal === 'past-due'}
        onClose={() => setActiveModal(null)}
        onSuccess={() => {
          setActiveModal(null);
          refetch();
        }}
      />
      <ClearUncollectibleModal
        billId={params.billId}
        isOpen={activeModal === 'clear-uncollectible'}
        onClose={() => setActiveModal(null)}
        onSuccess={() => {
          setActiveModal(null);
          refetch();
        }}
      />
    </div>
  );
}
