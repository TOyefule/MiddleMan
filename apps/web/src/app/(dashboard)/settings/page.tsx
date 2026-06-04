'use client';

import { trpc } from '@/lib/trpc';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  Skeleton,
} from '@middleman/ui';
import { useState } from 'react';

export default function SettingsPage() {
  const { data: me, isLoading } = trpc.me.get.useQuery();
  const updateMut = trpc.me.updateProfile.useMutation();

  const [billingDay, setBillingDay] = useState<number | undefined>();

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and billing preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <p className="text-sm">{me?.email}</p>
          </div>
          <div>
            <Label>SaaS tier</Label>
            <p className="text-sm capitalize">{me?.saasTier}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing day</CardTitle>
          <CardDescription>
            The day of the month your consolidated bill is generated (1 – 28).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="number"
              min={1}
              max={28}
              className="w-24"
              defaultValue={me?.billingDay}
              onChange={(e) => setBillingDay(Number(e.target.value))}
            />
            <Button
              disabled={updateMut.isPending}
              onClick={() => {
                if (billingDay) updateMut.mutate({ billingDay });
              }}
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
