'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button, Input, Label, Textarea, Card, CardContent, CardHeader, CardTitle } from '@middleman/ui';

interface AdjustBillModalProps {
  billId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdjustBillModal({ billId, isOpen, onClose, onSuccess }: AdjustBillModalProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const adjustMutation = trpc.admin.bills.adjust.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!amount || !reason) {
      setError('Please fill in all fields');
      return;
    }

    const amountCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountCents)) {
      setError('Invalid amount');
      return;
    }

    setIsLoading(true);
    try {
      await adjustMutation.mutateAsync({
        billId,
        amountCents,
        reason,
      });
      setAmount('');
      setReason('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adjusting bill');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Adjust Bill</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount ($ — positive = charge, negative = credit)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="10.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {amount && (
                  <>
                    {parseFloat(amount) > 0 ? '✓ Charge' : parseFloat(amount) < 0 ? '✓ Credit' : 'No change'}
                  </>
                )}
              </p>
            </div>

            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Overage charge for extra users"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isLoading}
                rows={3}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Adjusting...' : 'Adjust Bill'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
