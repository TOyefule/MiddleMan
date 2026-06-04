'use client';

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

export default function KycPage() {
  const { data: profile, isLoading } = trpc.kyc.status.useQuery();
  const startMutation = trpc.kyc.startFullVerification.useMutation();

  const handleStart = async () => {
    const result = await startMutation.mutateAsync();
    if (result.url) {
      window.location.href = result.url;
    }
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const level = profile?.level ?? 'none';
  const status = profile?.status ?? 'not_started';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Identity verification</h1>
        <p className="text-muted-foreground">
          Full KYC is required before we can issue virtual cards for your subscriptions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>Verification status</CardTitle>
            <KycBadge level={level} status={status} />
          </div>
          <CardDescription>
            {status === 'verified'
              ? "You're fully verified. Virtual cards can be issued for your subscriptions."
              : status === 'pending'
                ? 'Your verification is in progress. We'll notify you when it's complete.'
                : 'Complete verification to unlock virtual card issuing.'}
          </CardDescription>
        </CardHeader>
        {status !== 'verified' && status !== 'pending' && (
          <CardContent>
            <Button onClick={handleStart} disabled={startMutation.isPending}>
              {startMutation.isPending ? 'Starting...' : 'Start verification'}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function KycBadge({ level, status }: { level: string; status: string }) {
  if (status === 'verified') return <Badge variant="success">Verified</Badge>;
  if (status === 'pending') return <Badge variant="warning">Pending</Badge>;
  if (status === 'failed') return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="secondary">{level === 'light' ? 'Light only' : 'Not started'}</Badge>;
}
