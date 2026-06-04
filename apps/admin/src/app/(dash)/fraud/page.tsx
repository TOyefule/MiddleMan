'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@middleman/ui';

export default function FraudPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Fraud Queue</h1>
      <p className="text-muted-foreground">Stripe Radar alerts and suspicious activity.</p>
      <Card>
        <CardHeader><CardTitle>Fraud review</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Stripe Radar feeds (charge.dispute.*, radar.early_fraud_warning.*) will populate
            this queue. Full implementation in M5 after Stripe Issuing is live.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
