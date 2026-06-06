'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button, Label, Textarea, Card, CardContent, CardHeader, CardTitle } from '@middleman/ui';

interface ClearUncollectibleModalProps {
  billId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ClearUncollectibleModal({
  billId,
  isOpen,
  onClose,
  onSuccess,
}: ClearUncollectibleModalProps) {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const clearMutation = trpc.admin.bills.clearUncollectible.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!reason) {
      setError('Please provide a reason');
      return;
    }

    setIsLoading(true);
    try {
      await clearMutation.mutateAsync({
        billId,
        reason,
      });
      setReason('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error clearing uncollectible status');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Clear Uncollectible & Retry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-900">
                This will reset the bill status to <strong>pending_collection</strong> and trigger a payment retry. Customer will receive a notification.
              </p>
            </div>

            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Customer verified payment method is updated, spoke with customer and they're ready to pay"
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
                {isLoading ? 'Clearing...' : 'Clear & Retry'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
