'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@middleman/ui';
import { Loader2 } from 'lucide-react';

interface KycModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
  clientSecret?: string;
}

export function KycModal({ isOpen, onClose, sessionId, clientSecret }: KycModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !clientSecret) return;

    // This will be replaced with actual Stripe Identity Verification embed
    // For now, we show a placeholder
    setIsLoading(false);
  }, [isOpen, clientSecret]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Identity Verification</DialogTitle>
          <DialogDescription>
            We need to verify your identity before we can issue a virtual card. This takes about 2 minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : clientSecret ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Click the button below to start the verification process. You'll need:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>A government-issued ID (passport or driver's license)</li>
                <li>A clear photo of yourself</li>
                <li>A stable internet connection</li>
              </ul>

              {/* TODO: Embed Stripe Identity Verification component here */}
              <div className="bg-muted p-4 rounded border border-dashed">
                <p className="text-xs text-muted-foreground">
                  Stripe Identity Verification Component (clientSecret: {clientSecret.slice(0, 20)}...)
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                Your information is encrypted and processed securely. We'll never store or sell your personal data.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Loading verification...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
