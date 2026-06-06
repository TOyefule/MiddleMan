import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { WaitlistPageClient } from './_components/WaitlistPageClient';

export const metadata: Metadata = {
  title: 'MiddleMan — One bill for all your subscriptions',
  description:
    'MiddleMan puts a virtual card on every subscription, pays your providers, and charges you once a month. Join the waitlist and lock in founding member pricing.',
};

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect('/subscriptions');

  return <WaitlistPageClient />;
}
