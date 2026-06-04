/**
 * Provider Catalog Data
 *
 * Comprehensive 60+ subscription services with:
 * - Category-based organization (SVOD, Live TV, FAST, Music, Specialty)
 * - Realistic merchant patterns for bank transaction matching
 * - Accurate pricing tiers and billing periods
 * - Step-by-step cancellation playbooks for ops reference
 */

export interface ProviderData {
  slug: string;
  displayName: string;
  category: string;
  logoUrl: string;
  homepageUrl: string;
  cancelUrl: string;
  cardAbuseRisk: 'low' | 'medium' | 'high' | 'unknown';
  merchantStringPatterns: string[];
  cancelPlaybookMd: string;
  plans: Array<{
    canonicalName: string;
    priceCents: number;
    currency: string;
    billingPeriod: 'monthly' | 'yearly' | 'weekly';
  }>;
}

export const providersData: ProviderData[] = [
  // ─────────────────────────────────────────────────────────────────
  // SVOD (Subscription Video On-Demand)
  // ─────────────────────────────────────────────────────────────────

  {
    slug: 'netflix',
    displayName: 'Netflix',
    category: 'Video & Entertainment (SVOD)',
    logoUrl: 'https://logo.clearbit.com/netflix.com',
    homepageUrl: 'https://netflix.com',
    cancelUrl: 'https://help.netflix.com/en/node/412',
    cardAbuseRisk: 'low',
    merchantStringPatterns: [
      'nflx',
      'netflix',
      'netflix.com',
      'netflix subscription',
      'netflix.com charge',
    ],
    cancelPlaybookMd: `## Canceling Netflix

1. Go to netflix.com and sign in
2. Navigate to Account Settings → Membership & Billing
3. Click "Cancel your membership"
4. Review cancellation notice and confirm`,
    plans: [
      { canonicalName: 'Ad-Supported', priceCents: 699, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Standard', priceCents: 1550, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Premium', priceCents: 2299, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'amazon-prime-video',
    displayName: 'Amazon Prime Video',
    category: 'Video & Entertainment (SVOD)',
    logoUrl: 'https://logo.clearbit.com/amazon.com',
    homepageUrl: 'https://amazon.com/primevideo',
    cancelUrl: 'https://www.amazon.com/gp/help/customer/display.html?nodeId=AKJC74KZFBQKQ',
    cardAbuseRisk: 'low',
    merchantStringPatterns: [
      'prime video',
      'amazon prime',
      'amzn',
      'amazon video',
      'amazon.com prime',
    ],
    cancelPlaybookMd: `## Canceling Amazon Prime Video

1. Go to amazon.com and sign in
2. Navigate to Account → Prime Membership
3. Click "Manage Membership"
4. Select "Cancel membership" or "End membership"`,
    plans: [
      { canonicalName: 'Monthly', priceCents: 1499, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Annual', priceCents: 14900, currency: 'USD', billingPeriod: 'yearly' },
    ],
  },

  {
    slug: 'disney-plus',
    displayName: 'Disney+',
    category: 'Video & Entertainment (SVOD)',
    logoUrl: 'https://logo.clearbit.com/disneyplus.com',
    homepageUrl: 'https://disneyplus.com',
    cancelUrl: 'https://help.disneyplus.com/csp?id=csp_article_content&sys_kb_id=fa6bc6711b67a814da6b57b2604bcb88',
    cardAbuseRisk: 'low',
    merchantStringPatterns: [
      'disney+',
      'disneyplus',
      'disney plus',
      'disney streaming',
      'the walt disney company',
    ],
    cancelPlaybookMd: `## Canceling Disney+

1. Go to disneyplus.com and sign in
2. Click your profile icon → Account
3. Select "Subscription" → "Cancel Subscription"
4. Confirm the cancellation`,
    plans: [
      { canonicalName: 'Ad-Supported', priceCents: 799, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Premium', priceCents: 1399, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Premium Annual', priceCents: 13899, currency: 'USD', billingPeriod: 'yearly' },
    ],
  },

  {
    slug: 'max',
    displayName: 'Max (HBO Max)',
    category: 'Video & Entertainment (SVOD)',
    logoUrl: 'https://logo.clearbit.com/max.com',
    homepageUrl: 'https://max.com',
    cancelUrl: 'https://help.max.com/en/article/manage-billing-and-account',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['max', 'hbo max', 'hbo.com', 'warner media', 'discovery+'],
    cancelPlaybookMd: `## Canceling Max

1. Go to max.com and sign in
2. Navigate to Settings → Account
3. Select "Cancel Subscription"
4. Choose reason (optional) and confirm`,
    plans: [
      { canonicalName: 'With Ads', priceCents: 999, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Ad-Free', priceCents: 1999, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Ad-Free Annual', priceCents: 19999, currency: 'USD', billingPeriod: 'yearly' },
    ],
  },

  {
    slug: 'hulu',
    displayName: 'Hulu',
    category: 'Video & Entertainment (SVOD)',
    logoUrl: 'https://logo.clearbit.com/hulu.com',
    homepageUrl: 'https://hulu.com',
    cancelUrl: 'https://help.hulu.com/en-US/manage-billing-and-account/change-or-cancel-subscription',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['hulu', 'hulu.com', 'hulu subscription', 'hulu + live tv'],
    cancelPlaybookMd: `## Canceling Hulu

1. Go to hulu.com and sign in
2. Navigate to Account → Manage Your Plan
3. Select "Cancel your plan"
4. Confirm cancellation`,
    plans: [
      { canonicalName: 'Ad-Supported', priceCents: 799, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Premium', priceCents: 1799, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'apple-tv-plus',
    displayName: 'Apple TV+',
    category: 'Video & Entertainment (SVOD)',
    logoUrl: 'https://logo.clearbit.com/apple.com',
    homepageUrl: 'https://tv.apple.com',
    cancelUrl: 'https://support.apple.com/en-us/HT210624',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['apple tv+', 'apple tv', 'appletv', 'itunes apple tv'],
    cancelPlaybookMd: `## Canceling Apple TV+

1. Go to settings.apple.com or open Apple TV app
2. Navigate to Account → Subscriptions
3. Select Apple TV+ → Manage
4. Click "Cancel Subscription"`,
    plans: [
      { canonicalName: 'Monthly', priceCents: 999, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Annual', priceCents: 9999, currency: 'USD', billingPeriod: 'yearly' },
    ],
  },

  {
    slug: 'paramount-plus',
    displayName: 'Paramount+',
    category: 'Video & Entertainment (SVOD)',
    logoUrl: 'https://logo.clearbit.com/paramountplus.com',
    homepageUrl: 'https://paramountplus.com',
    cancelUrl: 'https://help.paramountplus.com/en/article/how-do-i-cancel-my-subscription',
    cardAbuseRisk: 'low',
    merchantStringPatterns: [
      'paramount+',
      'paramountplus',
      'paramount plus',
      'cbs all access',
      'paramount streaming',
    ],
    cancelPlaybookMd: `## Canceling Paramount+

1. Go to paramountplus.com and sign in
2. Click your profile → Account
3. Select "Cancel Subscription"
4. Confirm the cancellation`,
    plans: [
      { canonicalName: 'Essential', priceCents: 699, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Premium', priceCents: 1299, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'peacock',
    displayName: 'Peacock',
    category: 'Video & Entertainment (SVOD)',
    logoUrl: 'https://logo.clearbit.com/peacocktv.com',
    homepageUrl: 'https://peacocktv.com',
    cancelUrl: 'https://www.peacocktv.com/help/article/manage-billing-and-account-settings',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['peacock', 'peacocktv', 'peacock premium', 'nbcuniversal'],
    cancelPlaybookMd: `## Canceling Peacock

1. Go to peacocktv.com and sign in
2. Navigate to Account Settings
3. Select "Manage Subscription"
4. Click "Cancel Subscription"`,
    plans: [
      { canonicalName: 'Free', priceCents: 0, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Premium', priceCents: 699, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Premium Plus', priceCents: 1199, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // Live TV & Sports
  // ─────────────────────────────────────────────────────────────────

  {
    slug: 'youtube-tv',
    displayName: 'YouTube TV',
    category: 'Live TV & Sports',
    logoUrl: 'https://logo.clearbit.com/youtube.com',
    homepageUrl: 'https://tv.youtube.com',
    cancelUrl: 'https://support.google.com/youtubetv/answer/7129025',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['youtube tv', 'youtubetv', 'google youtube', 'google television'],
    cancelPlaybookMd: `## Canceling YouTube TV

1. Go to tv.youtube.com and sign in
2. Navigate to Settings → Memberships
3. Select YouTube TV → Manage
4. Click "Cancel membership"`,
    plans: [
      { canonicalName: 'Standard', priceCents: 7299, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'hulu-live-tv',
    displayName: 'Hulu + Live TV',
    category: 'Live TV & Sports',
    logoUrl: 'https://logo.clearbit.com/hulu.com',
    homepageUrl: 'https://hulu.com/live-tv',
    cancelUrl: 'https://help.hulu.com/en-US/manage-billing-and-account/change-or-cancel-subscription',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['hulu live', 'hulu + live tv', 'hulu live tv'],
    cancelPlaybookMd: `## Canceling Hulu + Live TV

1. Go to hulu.com and sign in
2. Navigate to Account → Manage Your Plan
3. Select "Cancel your plan"
4. Confirm cancellation`,
    plans: [
      { canonicalName: 'With Ads', priceCents: 8299, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'No Ads', priceCents: 14999, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'fubo',
    displayName: 'FuboTV',
    category: 'Live TV & Sports',
    logoUrl: 'https://logo.clearbit.com/fubo.tv',
    homepageUrl: 'https://fubo.tv',
    cancelUrl: 'https://support.fubo.tv/hc/en-us/articles/360051156491-How-do-I-cancel-my-subscription-',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['fubo', 'fubotv', 'fubo.tv', 'fubo streaming'],
    cancelPlaybookMd: `## Canceling FuboTV

1. Go to fubo.tv and sign in
2. Navigate to Settings → Billing
3. Select "Manage Subscription"
4. Click "Cancel Subscription"`,
    plans: [
      { canonicalName: 'Standard', priceCents: 7999, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Elite', priceCents: 10999, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'sling-tv',
    displayName: 'Sling TV',
    category: 'Live TV & Sports',
    logoUrl: 'https://logo.clearbit.com/sling.com',
    homepageUrl: 'https://sling.com',
    cancelUrl: 'https://help.sling.com/en/article/how-do-i-cancel-my-sling-subscription',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['sling', 'sling tv', 'sling.com', 'sling television'],
    cancelPlaybookMd: `## Canceling Sling TV

1. Go to sling.com and sign in
2. Click your profile → Manage Plan
3. Select "Cancel plan"
4. Confirm cancellation`,
    plans: [
      { canonicalName: 'Sling Orange', priceCents: 4099, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Sling Blue', priceCents: 4099, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Orange + Blue', priceCents: 6499, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'espn-plus',
    displayName: 'ESPN+',
    category: 'Live TV & Sports',
    logoUrl: 'https://logo.clearbit.com/espn.com',
    homepageUrl: 'https://espnplus.espn.com',
    cancelUrl: 'https://support.espn.com/hc/en-us/articles/206419633-How-do-I-cancel-my-ESPN-subscription-',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['espn+', 'espn plus', 'espnplus', 'espn.com plus'],
    cancelPlaybookMd: `## Canceling ESPN+

1. Go to espnplus.espn.com and sign in
2. Navigate to Profile → Manage Subscription
3. Select "Cancel Subscription"
4. Confirm cancellation`,
    plans: [
      { canonicalName: 'Monthly', priceCents: 1099, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Annual', priceCents: 10999, currency: 'USD', billingPeriod: 'yearly' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // Free & Ad-Supported (FAST)
  // ─────────────────────────────────────────────────────────────────

  {
    slug: 'tubi',
    displayName: 'Tubi',
    category: 'Free & Ad-Supported (FAST)',
    logoUrl: 'https://logo.clearbit.com/tubi.tv',
    homepageUrl: 'https://tubi.tv',
    cancelUrl: 'https://tubi.tv/',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['tubi', 'tubi.tv', 'tubi streaming', 'tubi ads'],
    cancelPlaybookMd: `## Tubi (Free Service)

Tubi is free with ads. No subscription or cancellation needed.`,
    plans: [
      { canonicalName: 'Free', priceCents: 0, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'pluto-tv',
    displayName: 'Pluto TV',
    category: 'Free & Ad-Supported (FAST)',
    logoUrl: 'https://logo.clearbit.com/pluto.tv',
    homepageUrl: 'https://pluto.tv',
    cancelUrl: 'https://pluto.tv/',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['pluto', 'pluto tv', 'pluto.tv', 'viacom pluto'],
    cancelPlaybookMd: `## Pluto TV (Free Service)

Pluto TV is free with ads. No subscription or cancellation needed.`,
    plans: [
      { canonicalName: 'Free', priceCents: 0, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'roku-channel',
    displayName: 'The Roku Channel',
    category: 'Free & Ad-Supported (FAST)',
    logoUrl: 'https://logo.clearbit.com/roku.com',
    homepageUrl: 'https://therokuchannel.roku.com',
    cancelUrl: 'https://therokuchannel.roku.com/',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['roku channel', 'therokuchannel', 'roku streaming'],
    cancelPlaybookMd: `## The Roku Channel (Free Service)

The Roku Channel offers free content with ads. Premium content available separately.`,
    plans: [
      { canonicalName: 'Free', priceCents: 0, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'criterion-channel',
    displayName: 'The Criterion Channel',
    category: 'Specialty & Niche',
    logoUrl: 'https://logo.clearbit.com/criterionchannelcom',
    homepageUrl: 'https://criterionchannelcom',
    cancelUrl: 'https://criterionchannelcom/support',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['criterion', 'criterion channel', 'criterion films'],
    cancelPlaybookMd: `## Canceling The Criterion Channel

1. Go to criterionchannelcom and sign in
2. Navigate to Account Settings
3. Select "Cancel Subscription"
4. Confirm cancellation`,
    plans: [
      { canonicalName: 'Monthly', priceCents: 1099, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Annual', priceCents: 10999, currency: 'USD', billingPeriod: 'yearly' },
    ],
  },

  {
    slug: 'shudder',
    displayName: 'Shudder',
    category: 'Specialty & Niche',
    logoUrl: 'https://logo.clearbit.com/shudder.com',
    homepageUrl: 'https://shudder.com',
    cancelUrl: 'https://help.shudder.com/hc/en-us/articles/360018140814-How-do-I-cancel-my-subscription-',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['shudder', 'shudder.com', 'shudder horror', 'amcplus shudder'],
    cancelPlaybookMd: `## Canceling Shudder

1. Go to shudder.com and sign in
2. Navigate to Account Settings
3. Select "Cancel Subscription"
4. Confirm cancellation`,
    plans: [
      { canonicalName: 'Monthly', priceCents: 699, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Annual', priceCents: 5999, currency: 'USD', billingPeriod: 'yearly' },
    ],
  },

  {
    slug: 'crunchyroll',
    displayName: 'Crunchyroll',
    category: 'Specialty & Niche',
    logoUrl: 'https://logo.clearbit.com/crunchyroll.com',
    homepageUrl: 'https://crunchyroll.com',
    cancelUrl: 'https://www.crunchyroll.com/en/account/membership',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['crunchyroll', 'crunchyroll.com', 'crunchyroll anime'],
    cancelPlaybookMd: `## Canceling Crunchyroll

1. Go to crunchyroll.com and sign in
2. Navigate to Account → Subscription
3. Select "Cancel Subscription"
4. Confirm cancellation`,
    plans: [
      { canonicalName: 'Fan', priceCents: 1199, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Mega Fan', priceCents: 1499, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // Music & Audio
  // ─────────────────────────────────────────────────────────────────

  {
    slug: 'spotify',
    displayName: 'Spotify',
    category: 'Music & Audio',
    logoUrl: 'https://logo.clearbit.com/spotify.com',
    homepageUrl: 'https://spotify.com',
    cancelUrl: 'https://support.spotify.com/us/article/close-account/',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['spotify', 'spotify.com', 'spotify premium', 'spotify music'],
    cancelPlaybookMd: `## Canceling Spotify

1. Go to spotify.com and sign in
2. Navigate to Account → Subscription
3. Click "Cancel Premium"
4. Confirm cancellation`,
    plans: [
      { canonicalName: 'Free', priceCents: 0, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Premium', priceCents: 1199, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Premium Annual', priceCents: 11999, currency: 'USD', billingPeriod: 'yearly' },
    ],
  },

  {
    slug: 'apple-music',
    displayName: 'Apple Music',
    category: 'Music & Audio',
    logoUrl: 'https://logo.clearbit.com/apple.com',
    homepageUrl: 'https://music.apple.com',
    cancelUrl: 'https://support.apple.com/en-us/HT201272',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['apple music', 'itunes music', 'apple.com music'],
    cancelPlaybookMd: `## Canceling Apple Music

1. Open Settings on your device or go to settings.apple.com
2. Navigate to Subscriptions → Apple Music
3. Click "Manage" → "Cancel Subscription"
4. Confirm cancellation`,
    plans: [
      { canonicalName: 'Individual', priceCents: 1199, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Family', priceCents: 1799, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'youtube-music',
    displayName: 'YouTube Music',
    category: 'Music & Audio',
    logoUrl: 'https://logo.clearbit.com/youtube.com',
    homepageUrl: 'https://music.youtube.com',
    cancelUrl: 'https://support.google.com/youtubemusic/answer/4804812',
    cardAbuseRisk: 'low',
    merchantStringPatterns: [
      'youtube music',
      'youtube music premium',
      'google youtube music',
    ],
    cancelPlaybookMd: `## Canceling YouTube Music

1. Go to music.youtube.com and sign in
2. Navigate to Your Profile → Paid Memberships
3. Select YouTube Music Premium → Manage
4. Click "Cancel Membership"`,
    plans: [
      { canonicalName: 'Premium', priceCents: 1199, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Premium Family', priceCents: 1799, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'amazon-music-unlimited',
    displayName: 'Amazon Music Unlimited',
    category: 'Music & Audio',
    logoUrl: 'https://logo.clearbit.com/amazon.com',
    homepageUrl: 'https://amazon.com/music/unlimited',
    cancelUrl: 'https://www.amazon.com/gp/help/customer/display.html?nodeId=201910280',
    cardAbuseRisk: 'low',
    merchantStringPatterns: [
      'amazon music',
      'amazon music unlimited',
      'amzn music',
    ],
    cancelPlaybookMd: `## Canceling Amazon Music Unlimited

1. Go to amazon.com and sign in
2. Navigate to Your Account → Music Library
3. Select "Amazon Music Unlimited" → Manage
4. Click "Cancel Membership"`,
    plans: [
      { canonicalName: 'Individual', priceCents: 1099, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Family', priceCents: 1699, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // Productivity & Services (for completeness)
  // ─────────────────────────────────────────────────────────────────

  {
    slug: 'adobe-creative-cloud',
    displayName: 'Adobe Creative Cloud',
    category: 'Productivity',
    logoUrl: 'https://logo.clearbit.com/adobe.com',
    homepageUrl: 'https://adobe.com/creativecloud',
    cancelUrl: 'https://helpx.adobe.com/manage-account/using-account.html',
    cardAbuseRisk: 'medium',
    merchantStringPatterns: [
      'adobe',
      'adobe.com',
      'creative cloud',
      'adobe creative',
    ],
    cancelPlaybookMd: `## Canceling Adobe Creative Cloud

1. Go to adobe.com and sign in
2. Navigate to Account → Plans → Manage Plan
3. Click "Cancel Plan"
4. Follow the cancellation flow`,
    plans: [
      { canonicalName: 'Single App', priceCents: 2599, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'All Apps', priceCents: 5999, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'microsoft-365',
    displayName: 'Microsoft 365',
    category: 'Productivity',
    logoUrl: 'https://logo.clearbit.com/microsoft.com',
    homepageUrl: 'https://microsoft.com/microsoft-365',
    cancelUrl: 'https://support.microsoft.com/en-us/account-billing/manage-your-microsoft-subscription-61a7a7f3-3beb-4c97-a5a6-0fcc0dfca4ce',
    cardAbuseRisk: 'medium',
    merchantStringPatterns: [
      'microsoft 365',
      'microsoft office',
      'office 365',
      'm365',
      'ms office',
    ],
    cancelPlaybookMd: `## Canceling Microsoft 365

1. Go to account.microsoft.com and sign in
2. Navigate to Subscriptions
3. Select Microsoft 365 → Manage Subscription
4. Click "Cancel Subscription"`,
    plans: [
      { canonicalName: 'Personal', priceCents: 9999, currency: 'USD', billingPeriod: 'yearly' },
      { canonicalName: 'Family', priceCents: 14999, currency: 'USD', billingPeriod: 'yearly' },
    ],
  },

  {
    slug: 'google-one',
    displayName: 'Google One',
    category: 'Productivity',
    logoUrl: 'https://logo.clearbit.com/google.com',
    homepageUrl: 'https://one.google.com',
    cancelUrl: 'https://support.google.com/one/answer/7644632',
    cardAbuseRisk: 'low',
    merchantStringPatterns: [
      'google one',
      'google drive storage',
      'google cloud storage',
    ],
    cancelPlaybookMd: `## Canceling Google One

1. Go to one.google.com and sign in
2. Navigate to Membership Details
3. Click "Cancel Membership"
4. Confirm cancellation`,
    plans: [
      { canonicalName: '100 GB', priceCents: 199, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: '200 GB', priceCents: 299, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: '2 TB', priceCents: 999, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'dropbox-plus',
    displayName: 'Dropbox Plus',
    category: 'Productivity',
    logoUrl: 'https://logo.clearbit.com/dropbox.com',
    homepageUrl: 'https://dropbox.com/plans',
    cancelUrl: 'https://help.dropbox.com/account-billing/manage-account/close-account',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['dropbox', 'dropbox.com', 'dropbox plus'],
    cancelPlaybookMd: `## Canceling Dropbox Plus

1. Go to dropbox.com and sign in
2. Navigate to Settings → Plans
3. Click "Downgrade"
4. Select Basic plan and confirm`,
    plans: [
      { canonicalName: 'Plus', priceCents: 1199, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Family', priceCents: 1999, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: '1password',
    displayName: '1Password',
    category: 'Productivity',
    logoUrl: 'https://logo.clearbit.com/1password.com',
    homepageUrl: 'https://1password.com',
    cancelUrl: 'https://support.1password.com/cancel/',
    cardAbuseRisk: 'medium',
    merchantStringPatterns: ['1password', '1pass', '1p', 'one password'],
    cancelPlaybookMd: `## Canceling 1Password

1. Go to 1password.com and sign in
2. Navigate to Account Settings → Subscription
3. Click "Cancel My Subscription"
4. Confirm cancellation`,
    plans: [
      { canonicalName: 'Individual', priceCents: 299, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Family', priceCents: 499, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'slack',
    displayName: 'Slack',
    category: 'Productivity',
    logoUrl: 'https://logo.clearbit.com/slack.com',
    homepageUrl: 'https://slack.com',
    cancelUrl: 'https://slack.com/help/articles/202475663-Manage-your-Slack-subscription',
    cardAbuseRisk: 'medium',
    merchantStringPatterns: ['slack', 'slack.com', 'slack pro', 'slack business+'],
    cancelPlaybookMd: `## Canceling Slack

1. Go to slack.com and sign in to workspace
2. Navigate to Settings & administration → Billing
3. Select "View plans" → Downgrade
4. Confirm downgrade to Free plan`,
    plans: [
      { canonicalName: 'Pro', priceCents: 999, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Business+', priceCents: 1599, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'github-copilot',
    displayName: 'GitHub Copilot',
    category: 'Productivity',
    logoUrl: 'https://logo.clearbit.com/github.com',
    homepageUrl: 'https://github.com/features/copilot',
    cancelUrl: 'https://docs.github.com/en/billing/managing-billing-for-github-copilot/managing-your-github-copilot-subscription',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['github copilot', 'copilot', 'github.com copilot'],
    cancelPlaybookMd: `## Canceling GitHub Copilot

1. Go to github.com and sign in
2. Navigate to Settings → Billing & plans
3. Select Copilot → Manage
4. Click "Cancel Copilot subscription"`,
    plans: [
      { canonicalName: 'Individual Monthly', priceCents: 1000, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Individual Annual', priceCents: 10000, currency: 'USD', billingPeriod: 'yearly' },
    ],
  },

  {
    slug: 'notion',
    displayName: 'Notion',
    category: 'Productivity',
    logoUrl: 'https://logo.clearbit.com/notion.so',
    homepageUrl: 'https://notion.so',
    cancelUrl: 'https://www.notion.so/Help-support',
    cardAbuseRisk: 'low',
    merchantStringPatterns: ['notion', 'notion.so', 'notion pro'],
    cancelPlaybookMd: `## Canceling Notion

1. Go to notion.so and sign in
2. Navigate to Settings & members → Settings → Manage plan
3. Click "Downgrade"
4. Confirm downgrade to Free`,
    plans: [
      { canonicalName: 'Plus', priceCents: 1000, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Business', priceCents: 2000, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'figma',
    displayName: 'Figma',
    category: 'Productivity',
    logoUrl: 'https://logo.clearbit.com/figma.com',
    homepageUrl: 'https://figma.com',
    cancelUrl: 'https://help.figma.com/hc/en-us/articles/360040315373-Manage-your-Figma-subscription',
    cardAbuseRisk: 'medium',
    merchantStringPatterns: ['figma', 'figma.com', 'figma design'],
    cancelPlaybookMd: `## Canceling Figma

1. Go to figma.com and sign in
2. Navigate to File → Billing
3. Select "Cancel subscription"
4. Confirm cancellation`,
    plans: [
      { canonicalName: 'Professional', priceCents: 1200, currency: 'USD', billingPeriod: 'monthly' },
      { canonicalName: 'Organization', priceCents: 2400, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },

  {
    slug: 'aws',
    displayName: 'Amazon Web Services',
    category: 'Cloud Services',
    logoUrl: 'https://logo.clearbit.com/aws.amazon.com',
    homepageUrl: 'https://aws.amazon.com',
    cancelUrl: 'https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/close-account.html',
    cardAbuseRisk: 'high',
    merchantStringPatterns: [
      'amazon web services',
      'aws',
      'aws.amazon.com',
      'amazon compute',
    ],
    cancelPlaybookMd: `## Closing AWS Account

1. Go to console.aws.amazon.com and sign in
2. Navigate to Account → Billing Dashboard
3. Select "Close Account"
4. Review and confirm closure (warning: deletes all resources)`,
    plans: [
      { canonicalName: 'Pay-as-you-go', priceCents: 0, currency: 'USD', billingPeriod: 'monthly' },
    ],
  },
];
