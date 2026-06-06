import type { Metadata } from 'next';
import { SentinelPageClient } from './_components/SentinelPageClient';

export const metadata: Metadata = {
  title: 'Subscription Sentinel — Stop SaaS Sprawl Before It Breaks Your Budget',
  description:
    'Subscription Sentinel discovers every SaaS tool your company is paying for, flags unused licenses and shadow IT, and helps you cut the waste. Join the beta waitlist.',
};

export default function SentinelPage() {
  return <SentinelPageClient />;
}
