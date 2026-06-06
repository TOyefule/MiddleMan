'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

type Tier = 'starter' | 'business' | 'enterprise';
type SubmitState = 'idle' | 'loading' | 'success' | 'duplicate' | 'error';

const TIERS = [
  {
    id: 'starter' as Tier,
    name: 'Starter',
    price: '$99',
    regularPrice: '$199',
    period: '/mo',
    badge: null,
    scope: 'Up to 50 employees',
    description: 'Gain full visibility into your company\'s SaaS subscriptions. Catch waste before it compounds.',
    features: [
      { label: 'Up to 50 employees / seats', included: true },
      { label: 'Bank & card feed integration (3)', included: true },
      { label: 'Automated subscription discovery', included: true },
      { label: 'Subscription dashboard + inventory', included: true },
      { label: 'Renewal alerts', included: true },
      { label: 'Cancellation request portal', included: true },
      { label: 'AI duplicate-license detection', included: false },
      { label: 'Department spend breakdown', included: false },
      { label: 'Expense tool integrations', included: false },
    ],
    cta: 'Reserve Starter Spot',
    savingsLine: 'Save $1,200/yr at founding pricing',
  },
  {
    id: 'business' as Tier,
    name: 'Business',
    price: '$299',
    regularPrice: '$599',
    period: '/mo',
    badge: 'MOST POPULAR',
    scope: 'Up to 250 employees',
    description: 'AI-powered discovery, department-level insights, and assisted cancellations for growing teams.',
    features: [
      { label: 'Up to 250 employees / seats', included: true },
      { label: 'Unlimited bank & card integrations', included: true },
      { label: 'AI-powered subscription discovery', included: true },
      { label: 'Department spend breakdown', included: true },
      { label: 'Duplicate license detection', included: true },
      { label: 'Assisted cancellation & negotiation', included: true },
      { label: 'Expense tool integrations (Expensify, Concur)', included: true },
      { label: 'CSV/API export', included: true },
      { label: 'SSO (SAML/OIDC)', included: false },
    ],
    cta: 'Reserve Business Spot',
    savingsLine: 'Save $3,600/yr at founding pricing',
  },
  {
    id: 'enterprise' as Tier,
    name: 'Enterprise',
    price: 'Custom',
    regularPrice: null,
    period: '',
    badge: null,
    scope: 'Unlimited employees',
    description: 'White-glove onboarding, custom integrations, and a dedicated account manager.',
    features: [
      { label: 'Unlimited employees / seats', included: true },
      { label: 'Everything in Business', included: true },
      { label: 'SSO (SAML / OIDC)', included: true },
      { label: 'Custom ERP / finance integrations', included: true },
      { label: 'Dedicated account manager', included: true },
      { label: 'SLA-backed uptime guarantee', included: true },
      { label: 'Custom contract & invoicing', included: true },
      { label: 'On-premise deployment option', included: true },
      { label: 'Security & compliance review', included: true },
    ],
    cta: 'Contact Enterprise Sales',
    savingsLine: null,
  },
];

const FAQS = [
  {
    q: 'How does Sentinel find subscriptions we don\'t know about?',
    a: 'Sentinel connects to your company\'s bank feeds, corporate card programs, and expense management tools via secure APIs. Our AI categorizes and deduplicates recurring charges, surfacing unauthorized purchases, forgotten SaaS tools, and duplicate licenses across departments.',
  },
  {
    q: 'What integrations does Sentinel support?',
    a: 'Sentinel integrates with major corporate card programs (Brex, Ramp, Stripe Corporate), bank feeds, and expense tools (Expensify, Concur, Brex). Enterprise customers can request custom integrations with their ERP or finance systems.',
  },
  {
    q: 'How is this different from expense management tools?',
    a: 'Expense tools show you what was purchased. Sentinel tells you what\'s actively running — including subscriptions set up directly on personal cards, shadow IT tools, and services that never get expensed. We focus specifically on recurring subscription waste, not one-time purchases.',
  },
  {
    q: 'What does "assisted cancellation" mean for Business tier?',
    a: 'We identify unused or duplicate subscriptions, then help you cancel them. For many SaaS tools, we can initiate the cancellation process directly. For others, we provide step-by-step playbooks and handle vendor outreach on your behalf.',
  },
  {
    q: 'How is our financial data secured?',
    a: 'All data is encrypted in transit and at rest using AES-256. We use read-only API access and never store login credentials. Sentinel is SOC 2 Type II certified (in progress for founding beta). You can revoke access at any time.',
  },
  {
    q: 'What\'s the ROI for a typical midsized company?',
    a: 'Our beta customers report an average of $12,000–$40,000 in annual SaaS savings for 50–200 person companies, primarily from unused licenses, forgotten subscriptions, and vendor renegotiations. Most companies recover Sentinel\'s cost within the first month.',
  },
];

function CheckIcon({ included }: { included: boolean }) {
  return included ? (
    <span className="text-amber-400 text-sm font-bold">✓</span>
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
        className="w-full flex items-center justify-between py-5 text-left text-white font-medium hover:text-amber-400 transition-colors"
      >
        <span>{q}</span>
        <span className="ml-4 text-slate-400 text-xl flex-shrink-0">{open ? '−' : '+'}</span>
      </button>
      {open && <p className="pb-5 text-slate-400 text-sm leading-relaxed">{a}</p>}
    </div>
  );
}

export function SentinelPageClient() {
  const [selectedTier, setSelectedTier] = useState<Tier>('business');
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    companyName: '',
    role: '',
    companySize: '',
    saasToolCount: '',
    biggestChallenge: '',
  });
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [position, setPosition] = useState<number | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = (tier?: Tier) => {
    if (tier) setSelectedTier(tier);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.companyName) return;
    setSubmitState('loading');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: 'sentinel',
          email: form.email,
          firstName: form.firstName || undefined,
          tier: selectedTier,
          companyName: form.companyName,
          role: form.role || undefined,
          companySize: form.companySize || undefined,
          saasToolCount: form.saasToolCount || undefined,
          biggestChallenge: form.biggestChallenge || undefined,
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
    <div className="min-h-screen bg-[#080808] text-white">
      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080808]/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
              Middle<span className="text-blue-400">Man</span>
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-xl font-bold">
              <span className="text-amber-400">Sentinel</span>
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/"
              className="text-slate-400 hover:text-white transition-colors hidden sm:block"
            >
              ← For Individuals
            </Link>
            <button
              onClick={() => scrollToForm()}
              className="bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Get Early Access
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-amber-500/8 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm font-medium px-4 py-2 rounded-full mb-8">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            Private Beta · 200 Companies on Waitlist
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
            Your company is paying for{' '}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              subscriptions
            </span>
            <br />
            it doesn&apos;t know it has.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Subscription Sentinel discovers every SaaS tool your team is paying for, flags unused
            licenses and shadow IT, and helps you{' '}
            <strong className="text-white">cut the waste before it compounds</strong>.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => scrollToForm('business')}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8 py-4 rounded-xl transition-colors text-base"
            >
              Reserve Early Access for My Company →
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-600">
            No credit card. Beta companies lock in 50% off forever.
          </p>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { value: '$15K', label: 'avg annual SaaS waste / 50-person co.' },
              { value: '32%', label: 'of SaaS licenses go unused each month' },
              { value: '6.3 hrs', label: 'spent on sub management monthly' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-amber-400">{s.value}</div>
                <div className="mt-1 text-xs text-slate-500 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Problem ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-amber-400 text-sm font-semibold uppercase tracking-widest mb-4">
            The problem
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-6">
            SaaS sprawl is a silent budget leak
          </h2>
          <p className="text-center text-slate-400 max-w-2xl mx-auto mb-16">
            As companies grow, subscriptions proliferate across departments, cards, and email
            addresses. Finance can&apos;t track it. IT doesn&apos;t know it exists. And the CFO only
            finds out during the annual audit.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: '👤',
                title: 'Shadow IT',
                desc: 'Employees sign up for tools using personal cards and expense them later — or never.',
              },
              {
                icon: '🔄',
                title: 'Duplicate licenses',
                desc: 'Multiple teams buy the same tool independently. Three Figma accounts. Two Loom subscriptions.',
              },
              {
                icon: '💀',
                title: 'Zombie subscriptions',
                desc: 'Former employees\' accounts, cancelled projects, and trial upgrades still billing every month.',
              },
              {
                icon: '📈',
                title: 'Unnoticed price hikes',
                desc: 'SaaS vendors quietly raise prices on renewal. No one reviews the line items on the card statement.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white/2 border border-white/6 rounded-2xl p-6"
              >
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-amber-400 text-sm font-semibold uppercase tracking-widest mb-4">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            Full visibility in days, not quarters
          </h2>
          <div className="grid sm:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Connect your data',
                body: 'Link corporate cards, bank accounts, and expense tools. Setup takes under an hour.',
              },
              {
                step: '02',
                title: 'AI discovers everything',
                body: 'Our engine categorizes every recurring charge, deduplicates across sources, and maps to your org chart.',
              },
              {
                step: '03',
                title: 'Review & prioritize',
                body: 'Get a ranked list of waste: unused licenses, duplicates, zombie subs, and upcoming high-cost renewals.',
              },
              {
                step: '04',
                title: 'Cut the waste',
                body: 'Cancel subscriptions, renegotiate contracts, or reassign licenses — all from one dashboard.',
              },
            ].map((s) => (
              <div key={s.step}>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold mb-2 text-sm">{s.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who It's For ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-amber-400 text-sm font-semibold uppercase tracking-widest mb-4">
            Who it&apos;s for
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            Every role benefits differently
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                role: 'Finance & Accounting',
                icon: '💼',
                problems: [
                  'Chasing receipts for SaaS charges across 12 cards',
                  'Surprise renewals blowing the software budget',
                  'No single source of truth for annual SaaS spend',
                ],
                outcome: 'Full SaaS spend visibility before the month closes, not after.',
              },
              {
                role: 'IT & Operations',
                icon: '🖥️',
                problems: [
                  'Shadow IT tools you don\'t know are running',
                  'Former employees\' accounts still active (and billing)',
                  'No inventory of what software the company actually uses',
                ],
                outcome: 'A real-time software inventory across your entire org.',
              },
              {
                role: 'C-Suite & Founders',
                icon: '📊',
                problems: [
                  'Software spend growing faster than headcount',
                  'No data to decide which tools to consolidate',
                  'Audit surprises and board questions about SaaS burn',
                ],
                outcome: 'Clear ROI data on every tool. Make budget decisions with confidence.',
              },
            ].map((item) => (
              <div
                key={item.role}
                className="bg-white/2 border border-white/6 rounded-2xl p-8"
              >
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="font-semibold mb-4 text-amber-300">{item.role}</h3>
                <ul className="space-y-2 mb-6">
                  {item.problems.map((p) => (
                    <li key={p} className="text-xs text-slate-500 flex items-start gap-2">
                      <span className="text-slate-700 mt-0.5 flex-shrink-0">✗</span>
                      {p}
                    </li>
                  ))}
                </ul>
                <div className="border-t border-white/5 pt-4">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong className="text-amber-400">With Sentinel: </strong>
                    {item.outcome}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-amber-400 text-sm font-semibold uppercase tracking-widest mb-4">
            Beta pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center">
            50% off for beta companies. Forever.
          </h2>
          <p className="mt-4 text-center text-slate-400 max-w-xl mx-auto">
            Companies that join now lock in founding pricing for life. When we reach general
            availability, prices double. Yours won&apos;t.
          </p>

          <div className="mt-14 grid sm:grid-cols-3 gap-6">
            {TIERS.map((tier) => (
              <div
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`relative rounded-2xl border p-8 cursor-pointer transition-all ${
                  tier.id === 'business'
                    ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/30'
                    : 'border-white/8 bg-white/2 hover:border-white/15'
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full tracking-wider">
                    {tier.badge}
                  </div>
                )}

                <div className="mb-6">
                  <div className="text-sm font-semibold text-slate-400 mb-1">{tier.name}</div>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-extrabold text-white">{tier.price}</span>
                    {tier.period && (
                      <span className="text-slate-500 pb-1">{tier.period}</span>
                    )}
                    {tier.regularPrice && (
                      <span className="text-slate-600 pb-1 line-through text-sm">
                        {tier.regularPrice}/mo
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{tier.scope}</div>
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
                    <li key={f.label} className="flex items-start gap-2.5 text-sm">
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
                    tier.id === 'enterprise'
                      ? 'border border-white/15 text-slate-300 hover:bg-white/5'
                      : 'bg-amber-500 hover:bg-amber-400 text-black'
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
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-3xl mx-auto mb-6">
                🏢
              </div>
              <h2 className="text-3xl font-bold mb-3">Your company is on the list!</h2>
              {position !== null && (
                <p className="text-amber-400 font-semibold mb-4">
                  Company #{position.toLocaleString()} to join the Sentinel beta
                </p>
              )}
              <p className="text-slate-400 mb-4">
                We&apos;ve reserved your{' '}
                <strong className="text-white">
                  {TIERS.find((t) => t.id === selectedTier)?.name} founding pricing
                </strong>
                . Our team will reach out within a few days to schedule your onboarding call.
              </p>
              <p className="text-sm text-slate-500">
                Know another ops or finance leader dealing with SaaS sprawl? Refer them and move up
                the access queue.
              </p>
            </div>
          ) : submitState === 'duplicate' ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-3xl mx-auto mb-6">
                ✅
              </div>
              <h2 className="text-3xl font-bold mb-3">Already on the list!</h2>
              <p className="text-slate-400">
                That email is already registered. Our team will be in touch about beta access.
              </p>
            </div>
          ) : (
            <>
              <p className="text-center text-amber-400 text-sm font-semibold uppercase tracking-widest mb-4">
                Apply for beta access
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-center mb-3">
                Reserve your company&apos;s spot
              </h2>
              <p className="text-center text-slate-400 mb-10">
                We&apos;re onboarding beta companies individually. Tell us about your team so we can
                prioritize your access.
              </p>

              {/* Tier selector */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                {TIERS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTier(t.id)}
                    className={`py-3 px-2 rounded-xl text-sm font-medium border transition-all ${
                      selectedTier === t.id
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                        : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs opacity-70 mt-0.5">{t.price}{t.period}</div>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      Your name
                    </label>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                      placeholder="Jordan Smith"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      Work email <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="jordan@company.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                    Company name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.companyName}
                    onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                    placeholder="Acme Corp"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      Your role
                    </label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 appearance-none"
                    >
                      <option value="" className="bg-slate-900">
                        Select role...
                      </option>
                      <option value="cfo" className="bg-slate-900">CFO / Head of Finance</option>
                      <option value="cto" className="bg-slate-900">CTO / Head of IT</option>
                      <option value="coo" className="bg-slate-900">COO / Operations</option>
                      <option value="founder" className="bg-slate-900">Founder / CEO</option>
                      <option value="finance" className="bg-slate-900">Finance Manager / Controller</option>
                      <option value="it" className="bg-slate-900">IT Manager / SysAdmin</option>
                      <option value="procurement" className="bg-slate-900">Procurement / Purchasing</option>
                      <option value="other" className="bg-slate-900">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      Company size
                    </label>
                    <select
                      value={form.companySize}
                      onChange={(e) => setForm((f) => ({ ...f, companySize: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 appearance-none"
                    >
                      <option value="" className="bg-slate-900">
                        Select size...
                      </option>
                      <option value="10-50" className="bg-slate-900">10–50 employees</option>
                      <option value="51-200" className="bg-slate-900">51–200 employees</option>
                      <option value="201-1000" className="bg-slate-900">201–1,000 employees</option>
                      <option value="1000+" className="bg-slate-900">1,000+ employees</option>
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      Estimated SaaS tools in use
                    </label>
                    <select
                      value={form.saasToolCount}
                      onChange={(e) => setForm((f) => ({ ...f, saasToolCount: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 appearance-none"
                    >
                      <option value="" className="bg-slate-900">Select...</option>
                      <option value="<10" className="bg-slate-900">Fewer than 10</option>
                      <option value="10-25" className="bg-slate-900">10–25 tools</option>
                      <option value="26-50" className="bg-slate-900">26–50 tools</option>
                      <option value="50-100" className="bg-slate-900">50–100 tools</option>
                      <option value="100+" className="bg-slate-900">100+ tools</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      Biggest SaaS management challenge
                    </label>
                    <select
                      value={form.biggestChallenge}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, biggestChallenge: e.target.value }))
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 appearance-none"
                    >
                      <option value="" className="bg-slate-900">Select...</option>
                      <option value="visibility" className="bg-slate-900">Lack of visibility</option>
                      <option value="unauthorized" className="bg-slate-900">Unauthorized purchases</option>
                      <option value="renewals" className="bg-slate-900">Tracking renewals</option>
                      <option value="cost" className="bg-slate-900">Cost optimization</option>
                      <option value="duplicates" className="bg-slate-900">Duplicate tools</option>
                      <option value="offboarding" className="bg-slate-900">Employee offboarding cleanup</option>
                    </select>
                  </div>
                </div>

                {submitState === 'error' && (
                  <p className="text-red-400 text-sm text-center">
                    Something went wrong. Please try again.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitState === 'loading'}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-4 rounded-xl transition-colors text-base"
                >
                  {submitState === 'loading' ? 'Submitting...' : 'Reserve My Company\'s Beta Spot →'}
                </button>

                <p className="text-center text-xs text-slate-600">
                  Our team reviews every application. We&apos;ll follow up within 2 business days.
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
              <span className="text-amber-400">Sentinel</span>
              <span className="text-slate-600 text-sm font-normal ml-2">
                by Middle<span className="text-blue-400">Man</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">Know every subscription. Control every dollar.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            <Link href="/" className="hover:text-white transition-colors">
              For Individuals
            </Link>
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms of Service
            </a>
            <a href="mailto:sentinel@middleman.com" className="hover:text-white transition-colors">
              Contact Sales
            </a>
          </div>
        </div>
        <p className="text-center text-xs text-slate-700 mt-8">
          © {new Date().getFullYear()} MiddleMan Technologies, Inc. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
