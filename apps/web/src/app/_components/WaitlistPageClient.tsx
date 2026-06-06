'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

type Tier = 'free' | 'core' | 'pro';
type SubmitState = 'idle' | 'loading' | 'success' | 'duplicate' | 'error';

const TIERS = [
  {
    id: 'free' as Tier,
    name: 'Free',
    price: '$0',
    period: '/mo',
    badge: null,
    subLimit: '3 subscriptions',
    description: 'Track your subs and get one consolidated view. No virtual cards.',
    features: [
      { label: 'Subscription dashboard', included: true },
      { label: 'Auto-discovery via bank link', included: true },
      { label: 'Monthly spend overview', included: true },
      { label: 'Virtual cards (per sub)', included: false },
      { label: 'One consolidated bill', included: false },
      { label: 'Instant pause / cancel', included: false },
      { label: 'Up to 3 subscriptions', included: true },
    ],
    cta: 'Join Free',
    ctaVariant: 'outline',
    savingsLine: null,
  },
  {
    id: 'core' as Tier,
    name: 'Core',
    price: '$8',
    regularPrice: '$15',
    period: '/mo',
    badge: 'MOST POPULAR',
    subLimit: '10 subscriptions',
    description: 'A virtual card on every sub, one monthly bill, and instant cancel support.',
    features: [
      { label: 'Everything in Free', included: true },
      { label: 'Virtual card per subscription', included: true },
      { label: 'Single consolidated monthly bill', included: true },
      { label: 'Instant pause / cancel guidance', included: true },
      { label: 'Renewal price-change alerts', included: true },
      { label: 'Up to 10 subscriptions', included: true },
      { label: 'Priority support', included: false },
    ],
    cta: 'Lock in $8/mo forever',
    ctaVariant: 'primary',
    savingsLine: 'Save $84/yr vs regular pricing',
  },
  {
    id: 'pro' as Tier,
    name: 'Pro',
    price: '$20',
    regularPrice: '$35',
    period: '/mo',
    badge: 'BEST VALUE',
    subLimit: 'Unlimited subscriptions',
    description: 'Unlimited subs, advanced analytics, and family sharing for up to 3 members.',
    features: [
      { label: 'Everything in Core', included: true },
      { label: 'Unlimited subscriptions', included: true },
      { label: 'Spend analytics & insights', included: true },
      { label: 'Family sharing (up to 3)', included: true },
      { label: 'Annual spend forecasting', included: true },
      { label: 'Priority support', included: true },
      { label: 'Early access to new features', included: true },
    ],
    cta: 'Lock in $20/mo forever',
    ctaVariant: 'primary',
    savingsLine: 'Save $180/yr vs regular pricing',
  },
];

const FAQS = [
  {
    q: 'How does the virtual card actually work?',
    a: 'MiddleMan issues you a unique Visa virtual card for each subscription. You update each service to use its dedicated card. We charge you once a month — one line item on your bank statement. If you want to pause or cancel a subscription, we freeze that card instantly.',
  },
  {
    q: 'Is it safe to connect my bank account?',
    a: 'Yes. We use Plaid — the same technology trusted by Cash App, Venmo, and thousands of apps — to read-only scan your transactions for subscriptions. We never store your bank credentials. You can disconnect your bank at any time.',
  },
  {
    q: 'What happens if I miss a payment to MiddleMan?',
    a: 'We\'ll notify you immediately and retry automatically. Your subscriptions stay active during a brief grace period. If a payment still fails, we pause virtual cards to prevent you from being charged by providers while the issue is resolved.',
  },
  {
    q: 'What is "founding member pricing" exactly?',
    a: 'When you reserve a spot at Core or Pro tier, we lock that price for you forever — it will never increase, regardless of what we charge new users when we launch. It\'s our thank-you to early supporters.',
  },
  {
    q: 'When will MiddleMan launch publicly?',
    a: 'We\'re targeting a public launch later this year. Founding members get early access before the general public. The waitlist determines access order.',
  },
  {
    q: 'Can I change my plan after I join?',
    a: 'Absolutely. You can upgrade or downgrade at any time from your settings page. Note that founding member pricing only applies to the tier you reserved — if you upgrade, the higher tier will be at regular pricing unless you lock in a higher tier now.',
  },
];

function CheckIcon({ included }: { included: boolean }) {
  return included ? (
    <span className="text-blue-400 text-sm font-bold">✓</span>
  ) : (
    <span className="text-slate-600 text-sm">–</span>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-800">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left text-white font-medium hover:text-blue-400 transition-colors"
      >
        <span>{q}</span>
        <span className="ml-4 text-slate-400 text-xl flex-shrink-0">{open ? '−' : '+'}</span>
      </button>
      {open && <p className="pb-5 text-slate-400 text-sm leading-relaxed">{a}</p>}
    </div>
  );
}

export function WaitlistPageClient() {
  const [heroEmail, setHeroEmail] = useState('');
  const [selectedTier, setSelectedTier] = useState<Tier>('core');
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    subCount: '',
    monthlySpend: '',
    referral: '',
  });
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [position, setPosition] = useState<number | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = (tier?: Tier) => {
    if (tier) setSelectedTier(tier);
    if (heroEmail) setForm((f) => ({ ...f, email: heroEmail }));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) return;
    setSubmitState('loading');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: 'middleman',
          email: form.email,
          firstName: form.firstName || undefined,
          tier: selectedTier,
          subCount: form.subCount || undefined,
          monthlySpend: form.monthlySpend || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.duplicate) {
        setSubmitState('duplicate');
      } else {
        setPosition(data.position);
        setSubmitState('success');
      }
    } catch {
      setSubmitState('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#07070f] text-white">
      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#07070f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Middle<span className="text-blue-400">Man</span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/sentinel"
              className="text-slate-400 hover:text-white transition-colors hidden sm:block"
            >
              For Business →
            </Link>
            <Link
              href="/sign-in"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <button
              onClick={() => scrollToForm()}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Get Early Access
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium px-4 py-2 rounded-full mb-8">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            Early Access Open · 1,000 Founding Member Spots
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
            Stop juggling{' '}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              15 different
            </span>
            <br />
            subscription bills.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            MiddleMan puts a unique virtual card on every subscription, pays your providers, and
            sends you <strong className="text-white">one bill per month</strong>. Pause or cancel
            any sub instantly — no more calling customer service.
          </p>

          {/* Hero email capture */}
          <div className="mt-10 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={heroEmail}
              onChange={(e) => setHeroEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
            />
            <button
              onClick={() => scrollToForm()}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors whitespace-nowrap"
            >
              Reserve My Spot →
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-600">
            No credit card. No spam. Founding member pricing locked forever.
          </p>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { value: '$2,340', label: 'avg annual savings' },
              { value: '15 min', label: 'to set up' },
              { value: '1-tap', label: 'cancel any sub' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white">{s.value}</div>
                <div className="mt-1 text-xs text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Works with ── */}
      <section className="py-10 border-y border-white/5 overflow-hidden">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-600 mb-6">
          Works with every subscription you already have
        </p>
        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto px-6">
          {[
            '🎵 Spotify', '🎬 Netflix', '📺 Hulu', '🍎 Apple One', '🎮 Game Pass',
            '☁️ iCloud+', '🎨 Adobe CC', '💻 Microsoft 365', '📰 NYT', '🏋️ Peloton',
            '🎵 Tidal', '📦 Amazon Prime', '🎬 Disney+', '🧘 Calm', '+ hundreds more',
          ].map((s) => (
            <span
              key={s}
              className="bg-white/5 border border-white/5 text-slate-400 text-xs px-3 py-1.5 rounded-full"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-blue-400 text-sm font-semibold uppercase tracking-widest mb-4">
            The problem
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            Subscription chaos is costing you money
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                stat: '12',
                unit: 'subscriptions',
                desc: 'The average American actively pays for 12 subscriptions — and forgets about 3 of them.',
              },
              {
                stat: '31%',
                unit: 'price increase',
                desc: 'Subscription prices increased an average of 31% last year. Most people never noticed.',
              },
              {
                stat: '47%',
                unit: 'of subscribers',
                desc: 'Nearly half of subscribers are paying for at least one service they no longer actively use.',
              },
            ].map((item) => (
              <div
                key={item.stat}
                className="bg-white/3 border border-white/5 rounded-2xl p-8 text-center"
              >
                <div className="text-4xl font-extrabold text-white">
                  {item.stat}{' '}
                  <span className="text-slate-500 text-sm font-normal">{item.unit}</span>
                </div>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-blue-400 text-sm font-semibold uppercase tracking-widest mb-4">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            Set up in 15 minutes. Save all year.
          </h2>
          <div className="grid sm:grid-cols-3 gap-8 relative">
            {[
              {
                step: '01',
                title: 'Connect your bank',
                body: 'Link your bank account via Plaid. We scan your transactions and automatically detect every active subscription — including the ones you forgot about.',
              },
              {
                step: '02',
                title: 'Review & confirm',
                body: 'See every subscription in one clean dashboard. Confirm what you want to keep. We show you the exact amount each one costs and when it renews.',
              },
              {
                step: '03',
                title: 'We take it from here',
                body: 'We issue a unique virtual card per subscription and handle all the payments. You get one consolidated bill from us each month. Cancel anything with one tap.',
              },
            ].map((s, i) => (
              <div key={s.step} className="relative">
                {i < 2 && (
                  <div className="hidden sm:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-blue-500/30 to-transparent z-0 translate-x-4" />
                )}
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm mb-5">
                    {s.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{s.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-blue-400 text-sm font-semibold uppercase tracking-widest mb-4">
            Founding member pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center">
            Lock in your price forever
          </h2>
          <p className="mt-4 text-center text-slate-400 max-w-xl mx-auto">
            Founding member pricing is locked for life — it will never increase, regardless of what
            we charge new users at launch.
          </p>

          <div className="mt-14 grid sm:grid-cols-3 gap-6">
            {TIERS.map((tier) => (
              <div
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`relative rounded-2xl border p-8 cursor-pointer transition-all ${
                  tier.id === 'core'
                    ? 'border-blue-500/50 bg-blue-500/5 ring-1 ring-blue-500/30'
                    : 'border-white/8 bg-white/2 hover:border-white/15'
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wider">
                    {tier.badge}
                  </div>
                )}

                <div className="mb-6">
                  <div className="text-sm font-semibold text-slate-400 mb-1">{tier.name}</div>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-extrabold text-white">{tier.price}</span>
                    <span className="text-slate-500 pb-1">{tier.period}</span>
                    {tier.regularPrice && (
                      <span className="text-slate-600 pb-1 line-through text-sm">
                        {tier.regularPrice}/mo
                      </span>
                    )}
                  </div>
                  {tier.savingsLine && (
                    <div className="mt-2 text-xs text-green-400 font-medium">
                      ✓ {tier.savingsLine}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                    {tier.description}
                  </p>
                </div>

                <ul className="space-y-2.5 mb-8">
                  {tier.features.map((f) => (
                    <li key={f.label} className="flex items-center gap-2.5 text-sm">
                      <CheckIcon included={f.included} />
                      <span className={f.included ? 'text-slate-300' : 'text-slate-600'}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToForm(tier.id);
                  }}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                    tier.id === 'free'
                      ? 'border border-white/15 text-slate-300 hover:bg-white/5'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Waitlist Form ── */}
      <section ref={formRef} className="py-24 px-6 border-t border-white/5">
        <div className="max-w-xl mx-auto">
          {submitState === 'success' ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-3xl mx-auto mb-6">
                🎉
              </div>
              <h2 className="text-3xl font-bold mb-3">You&apos;re in!</h2>
              {position !== null && (
                <p className="text-blue-400 font-semibold mb-4">
                  You&apos;re #{position.toLocaleString()} on the waitlist
                </p>
              )}
              <p className="text-slate-400 mb-6">
                Your{' '}
                <strong className="text-white">
                  {TIERS.find((t) => t.id === selectedTier)?.name} founding member pricing
                </strong>{' '}
                is locked in. We&apos;ll email you when early access opens.
              </p>
              <p className="text-sm text-slate-500">
                Know someone drowning in subscription bills? Share MiddleMan and help them get early
                access too.
              </p>
            </div>
          ) : submitState === 'duplicate' ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-3xl mx-auto mb-6">
                ✅
              </div>
              <h2 className="text-3xl font-bold mb-3">Already reserved!</h2>
              <p className="text-slate-400">
                That email is already on the list. We&apos;ll reach out when it&apos;s your turn.
              </p>
            </div>
          ) : (
            <>
              <p className="text-center text-blue-400 text-sm font-semibold uppercase tracking-widest mb-4">
                Reserve your spot
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-center mb-3">
                Join the waitlist
              </h2>
              <p className="text-center text-slate-400 mb-10">
                Tell us a bit about your subscriptions — it helps us prioritize early access.
              </p>

              {/* Tier selector */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                {TIERS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTier(t.id)}
                    className={`py-3 px-2 rounded-xl text-sm font-medium border transition-all ${
                      selectedTier === t.id
                        ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                        : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs opacity-70 mt-0.5">{t.price}/mo</div>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      First name
                    </label>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                      placeholder="Alex"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      Email <span className="text-blue-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="alex@email.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      How many active subscriptions?
                    </label>
                    <select
                      value={form.subCount}
                      onChange={(e) => setForm((f) => ({ ...f, subCount: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/60 appearance-none"
                    >
                      <option value="" className="bg-slate-900">
                        Select...
                      </option>
                      <option value="1-4" className="bg-slate-900">
                        1–4 subscriptions
                      </option>
                      <option value="5-9" className="bg-slate-900">
                        5–9 subscriptions
                      </option>
                      <option value="10-15" className="bg-slate-900">
                        10–15 subscriptions
                      </option>
                      <option value="15+" className="bg-slate-900">
                        15+ subscriptions
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      Monthly subscription spend?
                    </label>
                    <select
                      value={form.monthlySpend}
                      onChange={(e) => setForm((f) => ({ ...f, monthlySpend: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/60 appearance-none"
                    >
                      <option value="" className="bg-slate-900">
                        Select...
                      </option>
                      <option value="<50" className="bg-slate-900">
                        Under $50/mo
                      </option>
                      <option value="50-100" className="bg-slate-900">
                        $50–$100/mo
                      </option>
                      <option value="100-250" className="bg-slate-900">
                        $100–$250/mo
                      </option>
                      <option value="250+" className="bg-slate-900">
                        $250+/mo
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                    How did you hear about MiddleMan?
                  </label>
                  <select
                    value={form.referral}
                    onChange={(e) => setForm((f) => ({ ...f, referral: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/60 appearance-none"
                  >
                    <option value="" className="bg-slate-900">
                      Select...
                    </option>
                    <option value="twitter" className="bg-slate-900">
                      Twitter / X
                    </option>
                    <option value="reddit" className="bg-slate-900">
                      Reddit
                    </option>
                    <option value="friend" className="bg-slate-900">
                      Friend or colleague
                    </option>
                    <option value="search" className="bg-slate-900">
                      Google / Search
                    </option>
                    <option value="newsletter" className="bg-slate-900">
                      Newsletter
                    </option>
                    <option value="producthunt" className="bg-slate-900">
                      Product Hunt
                    </option>
                    <option value="other" className="bg-slate-900">
                      Other
                    </option>
                  </select>
                </div>

                {submitState === 'error' && (
                  <p className="text-red-400 text-sm text-center">
                    Something went wrong. Please try again.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitState === 'loading'}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors text-base"
                >
                  {submitState === 'loading' ? 'Reserving your spot...' : 'Reserve My Founding Member Spot →'}
                </button>

                <p className="text-center text-xs text-slate-600">
                  No spam. No credit card required. We&apos;ll only email you about your early access.
                </p>
              </form>
            </>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently asked questions</h2>
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="text-lg font-bold">
              Middle<span className="text-blue-400">Man</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">One bill. All your subscriptions.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            <Link href="/sentinel" className="hover:text-white transition-colors">
              For Business
            </Link>
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms of Service
            </a>
            <Link href="/sign-in" className="hover:text-white transition-colors">
              Sign In
            </Link>
          </div>
        </div>
        <p className="text-center text-xs text-slate-700 mt-8">
          © {new Date().getFullYear()} MiddleMan Technologies, Inc. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
