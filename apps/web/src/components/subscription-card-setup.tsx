'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Loader2 } from '@middleman/ui';
import { CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { KycModal } from './kyc-modal';
import type { Subscription } from '@middleman/db';

interface SubscriptionCardSetupProps {
  subscription: Subscription & { providerId: string | null };
}

export function SubscriptionCardSetup({ subscription }: SubscriptionCardSetupProps) {
  const [showKycModal, setShowKycModal] = useState(false);

  // Fetch user's KYC status
  const { data: kycStatus, isLoading: kycLoading } = trpc.kyc.status.useQuery();

  // Fetch or create KYC session
  const kycMutation = trpc.kyc.startFullVerification.useMutation();

  // Fetch virtual card for this subscription
  const { data: virtualCard } = trpc.subscriptions.getCard.useQuery(
    { subscriptionId: subscription.id },
    { enabled: !!subscription.id },
  );

  // Issue card mutation
  const issueCardMutation = trpc.subscriptions.issueCard.useMutation({
    onSuccess: () => {
      // Card issued, refresh
    },
  });

  const handleStartKyc = async () => {
    try {
      const session = await kycMutation.mutateAsync();
      // Modal will receive session details
      setShowKycModal(true);
    } catch (err) {
      console.error('Failed to start KYC:', err);
    }
  };

  const handleIssueCard = async () => {
    try {
      await issueCardMutation.mutateAsync({ subscriptionId: subscription.id });
    } catch (err) {
      console.error('Failed to issue card:', err);
    }
  };

  // Determine current status
  const isVerified = kycStatus?.status === 'verified';
  const isCardActive = virtualCard?.status === 'active';
  const isCardPending = virtualCard?.status === 'pending';

  if (!subscription.providerId) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="py-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-900">Provider Not Linked</p>
            <p className="text-yellow-800 text-xs mt-1">
              Link this subscription to a provider before issuing a card.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Virtual Card
            </CardTitle>
            {isCardActive && <Badge variant="default">Active</Badge>}
            {isCardPending && <Badge variant="secondary">Pending Verification</Badge>}
            {!virtualCard && <Badge variant="outline">Not Issued</Badge>}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isCardActive && virtualCard ? (
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs opacity-75">Card Number</p>
                  <p className="text-lg font-mono">•••• •••• •••• {virtualCard.last4}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-75">Status</p>
                  <p className="font-semibold">Active</p>
                </div>
              </div>

              <div>
                <p className="text-xs opacity-75 mb-1">Monthly Spending Limit</p>
                <div className="bg-white bg-opacity-20 rounded p-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>${virtualCard.currentCycleSpentCents ? (virtualCard.currentCycleSpentCents / 100).toFixed(2) : '0.00'}</span>
                    <span>
                      ${virtualCard.perCycleCapCents ? (virtualCard.perCycleCapCents / 100).toFixed(2) : '—'}
                    </span>
                  </div>
                  <div className="w-full bg-white bg-opacity-20 rounded-full h-1">
                    <div
                      className="bg-green-400 h-1 rounded-full"
                      style={{
                        width: virtualCard.perCycleCapCents
                          ? `${((virtualCard.currentCycleSpentCents ?? 0) / virtualCard.perCycleCapCents) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs opacity-75">
                This card is exclusively for your {subscription.rawMerchantName ?? 'subscription'} purchases.
              </p>
            </div>
          ) : isCardPending ? (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="py-4 flex gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Verifying Card</p>
                  <p className="text-blue-800 text-xs mt-1">
                    We're running a test charge to verify your card. This usually takes a few minutes.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : isVerified ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ready to issue a virtual card for ${subscription.expectedAmountCents ? (subscription.expectedAmountCents / 100).toFixed(2) : '—'} / month.
              </p>
              <Button
                onClick={handleIssueCard}
                disabled={issueCardMutation.isPending}
                className="w-full"
              >
                {issueCardMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Issue Virtual Card
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Verify your identity to receive a virtual card for this subscription.
              </p>
              <Button
                onClick={handleStartKyc}
                disabled={kycMutation.isPending || kycLoading}
                className="w-full"
              >
                {kycMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Start Identity Verification
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <KycModal
        isOpen={showKycModal}
        onClose={() => setShowKycModal(false)}
        sessionId={kycMutation.data?.sessionId}
        clientSecret={kycMutation.data?.clientSecret}
      />
    </>
  );
}
