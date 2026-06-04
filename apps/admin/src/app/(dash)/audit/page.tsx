'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@middleman/ui';

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Audit Log</h1>
      <p className="text-muted-foreground">Append-only log of every admin action and system event.</p>
      <Card>
        <CardHeader><CardTitle>Audit trail</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Filterable audit log viewer with actor, action, target, diff, IP, and timestamp.
            Full table UI ships in M5. Data is already being written via service modules.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
