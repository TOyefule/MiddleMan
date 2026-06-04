/**
 * Seed Providers Script
 *
 * Populates the providers and provider_plans tables with 50+ common US subscriptions.
 * Run with: pnpm seed:providers
 */

import { getDb, eq } from '../src/index';
import * as schema from '../src/schema';
import { providersData } from './providers.data';

async function seedProviders() {
  const db = getDb();

  console.log('🌱 Starting provider catalog seed...');
  console.log(`   Seeding ${providersData.length} providers with ${providersData.reduce((sum, p) => sum + p.plans.length, 0)} plans`);

  try {
    // Clear existing providers (optional - uncomment if you want to reset)
    // await db.delete(schema.providerPlans);
    // await db.delete(schema.providers);
    // console.log('   Cleared existing providers');

    let providersInserted = 0;
    let plansInserted = 0;

    for (const providerData of providersData) {
      // Check if provider already exists
      const existing = await db
        .select()
        .from(schema.providers)
        .where(eq(schema.providers.slug, providerData.slug))
        .limit(1);

      if (existing.length > 0) {
        console.log(`   ⏭️  Skipping ${providerData.displayName} (already exists)`);
        continue;
      }

      // Insert provider
      const [provider] = await db
        .insert(schema.providers)
        .values({
          slug: providerData.slug,
          displayName: providerData.displayName,
          logoUrl: providerData.logoUrl,
          homepageUrl: providerData.homepageUrl,
          cancelUrl: providerData.cancelUrl,
          cardAbuseRisk: providerData.cardAbuseRisk,
          merchantStringPatterns: providerData.merchantStringPatterns,
          cancelPlaybookMd: providerData.cancelPlaybookMd,
        })
        .returning();

      providersInserted++;
      console.log(`   ✅ ${providerData.displayName} (${providerData.merchantStringPatterns.length} patterns)`);

      // Insert plans
      for (const planData of providerData.plans) {
        await db
          .insert(schema.providerPlans)
          .values({
            providerId: provider.id,
            canonicalName: planData.canonicalName,
            priceCents: planData.priceCents,
            currency: planData.currency,
            billingPeriod: planData.billingPeriod,
          })
          .returning();

        plansInserted++;
      }
    }

    console.log('\n✨ Seed complete!');
    console.log(`   Providers inserted: ${providersInserted}`);
    console.log(`   Plans inserted: ${plansInserted}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Run pnpm db:studio to verify in Drizzle Studio');
    console.log('   2. Test subscription discovery with these providers');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedProviders().then(() => {
  process.exit(0);
});
