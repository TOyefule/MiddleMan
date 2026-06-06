'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button, Label, Textarea, Card, CardContent, CardHeader, CardTitle } from '@middleman/ui';

interface MarkPastDueModalProps {
  billId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MarkPastDueModal({ billId, isOpen, onClose, onSuccess }: MarkPastDueModalProps) {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const markPastDueMutation = trpc.admin.bills.markPastDue.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!reason) {
      setError('Please provide a reason');
      return;
    }

    setIsLoading(true);
    try {
      await markPastDueMutation.mutateAsync({
        billId,
        reason,
      });
      setReason('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error marking bill as past due');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Mark Bill as Past Due</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm text-yellow-900">
                This will manually escalate the bill to past due status. Customer will receive a payment reminder.
              </p>
            </div>

            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Manual escalation per policy, customer contacted"
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
                {isLoading ? 'Marking...' : 'Mark Past Due'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
