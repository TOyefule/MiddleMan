'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button, Label, Textarea, Card, CardContent, CardHeader, CardTitle, formatCents } from '@middleman/ui';

interface WaiveFeModalProps {
  billId: string;
  lateFeeCents: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function WaiveFeModal({
  billId,
  lateFeeCents,
  isOpen,
  onClose,
  onSuccess,
}: WaiveFeModalProps) {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const waiveFeeMutation = trpc.admin.bills.waiveFee.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!reason) {
      setError('Please provide a reason');
      return;
    }

    setIsLoading(true);
    try {
      await waiveFeeMutation.mutateAsync({
        billId,
        reason,
      });
      setReason('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error waiving fee');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Waive Late Fee</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <p className="text-sm text-green-900">
                <strong>Fee to waive:</strong> {formatCents(lateFeeCents)}
              </p>
            </div>

            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="e.g., First-time delinquency, system error, customer retention"
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
                {isLoading ? 'Waiving...' : 'Waive Fee'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
