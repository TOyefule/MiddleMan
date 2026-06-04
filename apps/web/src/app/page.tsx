import Link from 'next/link';
import { Button } from '@middleman/ui';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect('/subscriptions');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Middle<span className="text-primary">Man</span>
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">
          One bill. All your subscriptions. Total control.
        </p>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          We put a unique virtual card on every subscription, pay your providers, and charge you
          once a month. Pause or cancel any sub with one click.
        </p>
      </div>

      <div className="flex gap-4">
        <Button asChild size="lg">
          <Link href="/sign-up">Get started free</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
        {[
          {
            title: 'See everything',
            desc: 'All your subscriptions in one dashboard with auto-detection via your bank.',
          },
          {
            title: 'Pay once',
            desc: 'We consolidate every charge into a single monthly bill. No surprises.',
          },
          {
            title: 'Cancel easily',
            desc: 'One tap pauses the card. We send you the exact steps to finish canceling.',
          },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border p-6">
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
