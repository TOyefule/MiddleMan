'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@middleman/ui';

export default function FloatCapsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Float Caps</h1>
      <p className="text-muted-foreground">View and override per-user monthly spending caps.</p>
      <Card>
        <CardHeader><CardTitle>Cap management</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Search for a user by email or ID, view their current cap ($500 default),
            current-period spend, and override the cap with audit logging.
          </p>
          <p className="mt-4 text-sm">Full UI ships in M5. Use the tRPC admin.floatCaps.lift mutation via API for now.</p>
        </CardContent>
      </Card>
    </div>
  );
}
