'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Button, Input, Label } from '@middleman/ui';
import { ArrowRight, Plus, Loader2 } from 'lucide-react';

export default function UnknownMerchantsPage() {
  const { data: subs, isLoading, refetch } = trpc.admin.unknownMerchants.list.useQuery();
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    displayName: '',
    slug: '',
    patterns: '',
    cancelUrl: '',
    homepageUrl: '',
  });

  const linkMutation = trpc.admin.unknownMerchants.linkToProvider.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedSub(null);
    },
  });

  const createMutation = trpc.admin.unknownMerchants.createProvider.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreateModal(false);
      setCreateForm({ displayName: '', slug: '', patterns: '', cancelUrl: '', homepageUrl: '' });
    },
  });

  const handleLinkToProvider = (subscriptionId: string, providerId: string) => {
    linkMutation.mutate({ subscriptionId, providerId });
  };

  const handleCreateProvider = () => {
    createMutation.mutate({
      displayName: createForm.displayName,
      slug: createForm.slug,
      merchantStringPatterns: createForm.patterns.split('\n').filter(Boolean),
      cancelUrl: createForm.cancelUrl,
      homepageUrl: createForm.homepageUrl,
      linkToSubscriptionId: selectedSub || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Unknown Merchants</h1>
          <p className="text-muted-foreground mt-1">
            Subscriptions that couldn't be matched. Link to providers or create new ones.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          New Provider
        </Button>
      </div>

      {isLoading && <Skeleton className="h-64" />}
      {subs && subs.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">All subscriptions matched. Great job!</p>
          </CardContent>
        </Card>
      )}
      {subs && subs.length > 0 && (
        <div className="space-y-3">
          {subs.map((s) => (
            <Card key={s.id} className="cursor-pointer hover:bg-accent">
              <CardContent className="py-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{s.rawMerchantName ?? 'Unknown'}</p>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>User: {s.userId.slice(0, 8)}...</span>
                        <span>Amount: ${(s.expectedAmountCents ?? 0) / 100}</span>
                        <span>Billing: {s.billingPeriod}</span>
                      </div>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      {s.source}
                    </span>
                  </div>

                  {selectedSub === s.id && (
                    <div className="bg-muted p-3 rounded space-y-2 border-l-2 border-blue-500">
                      <p className="text-sm font-medium">Link to provider:</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Provider ID (UUID)"
                          className="text-xs"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value) {
                              handleLinkToProvider(s.id, e.currentTarget.value);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedSub(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Or{' '}
                        <button
                          onClick={() => {
                            setShowCreateModal(true);
                            setSelectedSub(s.id);
                          }}
                          className="text-blue-600 hover:underline"
                        >
                          create a new provider
                        </button>
                      </p>
                    </div>
                  )}

                  {selectedSub !== s.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => setSelectedSub(s.id)}
                    >
                      <ArrowRight className="w-4 h-4" />
                      Link to Provider
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Provider</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="e.g., My Local Gym"
                  value={createForm.displayName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, displayName: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL-safe)</Label>
                <Input
                  id="slug"
                  placeholder="e.g., my-local-gym"
                  value={createForm.slug}
                  onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="homepageUrl">Homepage URL</Label>
                <Input
                  id="homepageUrl"
                  type="url"
                  placeholder="https://example.com"
                  value={createForm.homepageUrl}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, homepageUrl: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancelUrl">Cancel URL</Label>
                <Input
                  id="cancelUrl"
                  type="url"
                  placeholder="https://example.com/cancel"
                  value={createForm.cancelUrl}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, cancelUrl: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patterns">Merchant Patterns (one per line)</Label>
                <textarea
                  id="patterns"
                  className="w-full border rounded px-3 py-2 text-sm font-mono"
                  rows={3}
                  placeholder="gym&#10;local gym&#10;fitness"
                  value={createForm.patterns}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, patterns: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({
                      displayName: '',
                      slug: '',
                      patterns: '',
                      cancelUrl: '',
                      homepageUrl: '',
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleCreateProvider}
                  disabled={
                    createMutation.isPending ||
                    !createForm.displayName ||
                    !createForm.slug ||
                    !createForm.patterns ||
                    !createForm.cancelUrl ||
                    !createForm.homepageUrl
                  }
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
