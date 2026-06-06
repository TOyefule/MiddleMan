'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@middleman/ui';

/**
 * Convenience route that redirects to the current bill detail.
 * Fetches the current cycle bill and redirects to /bills/[billId]
 */
export default function CurrentBillPage() {
  const router = useRouter();
  const { data: preview, isLoading, error } = trpc.bills.preview.useQuery();

  useEffect(() => {
    if (preview && preview.billId) {
      router.replace(`/bills/${preview.billId}`);
    } else if (error || (!isLoading && !preview)) {
      router.push('/bills');
    }
  }, [preview, error, isLoading, router]);

  return <Skeleton className="h-96" />;
}
