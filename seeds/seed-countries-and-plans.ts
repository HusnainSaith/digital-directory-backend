import 'reflect-metadata';
import { AppDataSource } from '../src/config/data-source';

// ============================================================================
// SEED — Countries & Subscription Plans
// ============================================================================
// Populates the countries and subscription_plans tables with initial data.
// Safe to re-run (uses upsert logic based on unique slug/code).
// ============================================================================

const COUNTRIES = [
  { name: 'United Arab Emirates', countryCode: 'AE', subdomain: 'ae', isActive: true },
  { name: 'Saudi Arabia', countryCode: 'SA', subdomain: 'sa', isActive: true },
  { name: 'Qatar', countryCode: 'QA', subdomain: 'qa', isActive: true },
  { name: 'Kuwait', countryCode: 'KW', subdomain: 'kw', isActive: true },
  { name: 'Bahrain', countryCode: 'BH', subdomain: 'bh', isActive: true },
  { name: 'Oman', countryCode: 'OM', subdomain: 'om', isActive: true },
];

const SUBSCRIPTION_PLANS = [
  { name: 'Free', price: 0, durationInDays: 365, isActive: true, stripePriceId: null },
  { name: 'Starter', price: 29.99, durationInDays: 30, isActive: true, stripePriceId: process.env.STRIPE_PRICE_STARTER || null },
  { name: 'Professional', price: 79.99, durationInDays: 30, isActive: true, stripePriceId: process.env.STRIPE_PRICE_PROFESSIONAL || null },
  { name: 'Enterprise', price: 199.99, durationInDays: 30, isActive: true, stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || null },
];

async function seed() {
  console.log('🌍 Seeding countries & subscription plans...');

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const queryRunner = AppDataSource.createQueryRunner();

  try {
    // ── Seed Countries ──────────────────────────────────────────────
    console.log('\n📌 Seeding countries...');
    for (const country of COUNTRIES) {
      const exists = await queryRunner.query(
        `SELECT id FROM countries WHERE country_code = $1`,
        [country.countryCode],
      );

      if (exists.length > 0) {
        console.log(`  ✓ Country "${country.name}" already exists, updating...`);
        await queryRunner.query(
          `UPDATE countries SET name=$1, subdomain=$2, is_active=$3 WHERE country_code=$4`,
          [country.name, country.subdomain, country.isActive, country.countryCode],
        );
      } else {
        console.log(`  + Creating country "${country.name}"...`);
        await queryRunner.query(
          `INSERT INTO countries (name, country_code, subdomain, is_active) VALUES ($1, $2, $3, $4)`,
          [country.name, country.countryCode, country.subdomain, country.isActive],
        );
      }
    }

    // ── Seed Subscription Plans ─────────────────────────────────────
    console.log('\n💰 Seeding subscription plans...');
    for (const plan of SUBSCRIPTION_PLANS) {
      const exists = await queryRunner.query(
        `SELECT id FROM subscription_plans WHERE name = $1`,
        [plan.name],
      );

      if (exists.length > 0) {
        console.log(`  ✓ Plan "${plan.name}" already exists, updating...`);
        await queryRunner.query(
          `UPDATE subscription_plans SET price=$1, duration_in_days=$2, is_active=$3, stripe_price_id=$4 WHERE name=$5`,
          [plan.price, plan.durationInDays, plan.isActive, plan.stripePriceId, plan.name],
        );
      } else {
        console.log(`  + Creating plan "${plan.name}"...`);
        await queryRunner.query(
          `INSERT INTO subscription_plans (name, price, duration_in_days, is_active, stripe_price_id) VALUES ($1, $2, $3, $4, $5)`,
          [plan.name, plan.price, plan.durationInDays, plan.isActive, plan.stripePriceId],
        );
      }
    }

    console.log('\n✅ Countries & subscription plans seeded successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

seed().catch(() => process.exit(1));
