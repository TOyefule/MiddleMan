'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Skeleton,
} from '@middleman/ui';

/**
 * Payment methods management page.
 * Users can view, set primary, and remove payment methods.
 */
export default function PaymentMethodsPage() {
  const { data: methods, isLoading, refetch } = trpc.paymentMethods.list.useQuery();
  const setPrimaryMut = trpc.paymentMethods.setPrimary.useMutation();
  const removeMut = trpc.paymentMethods.remove.useMutation();

  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleSetPrimary = async (id: string) => {
    await setPrimaryMut.mutateAsync({ id });
    refetch();
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await removeMut.mutateAsync({ id });
      refetch();
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Payment Methods</h1>
        <p className="text-muted-foreground">Manage your payment methods for automatic billing.</p>
      </div>

      {isLoading && <Skeleton className="h-48" />}

      {methods && methods.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">No payment methods on file.</p>
            <Button>
              Add Payment Method
            </Button>
          </CardContent>
        </Card>
      )}

      {methods && methods.length > 0 && (
        <div className="space-y-3">
          {methods.map((method) => (
            <Card key={method.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{method.displayName}</p>
                      {method.isPrimary && (
                        <Badge variant="success">Primary</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {method.type === 'ach_debit' ? 'ACH Account' : 'Card'} ending in {method.last4}
                    </p>
                    {method.expiresAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Expires {new Date(method.expiresAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!method.isPrimary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPrimary(method.id)}
                        disabled={setPrimaryMut.isPending}
                      >
                        Make Primary
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemove(method.id)}
                      disabled={removingId === method.id}
                    >
                      {removingId === method.id ? 'Removing...' : 'Remove'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Payment Method Button */}
      {methods && methods.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-6">
            <Button className="w-full">
              + Add Another Payment Method
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <p className="text-sm text-amber-900">
            <strong>Note:</strong> Payment methods are used for automatic billing. Your primary method will be charged on your billing due date.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
