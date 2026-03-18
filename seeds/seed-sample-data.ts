import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../src/config/data-source';

// ============================================================================
// COMPREHENSIVE DATABASE SEED
// ============================================================================
// Populates ALL tables with 10+ realistic, interconnected records.
// Safe to re-run: truncates dependent data, preserves existing roles/perms
// that were created by seed:all, then inserts fresh sample data.
//
// Run:  npx ts-node seeds/seed-sample-data.ts
// ============================================================================

const BCRYPT_SALT_ROUNDS = 12;

// ── Helper ──────────────────────────────────────────────────────────────────
function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString();
}

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

function pastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// ── Data Definitions ────────────────────────────────────────────────────────

const COUNTRIES = [
  { name: 'United Arab Emirates', code: 'AE', subdomain: 'ae' },
  { name: 'Saudi Arabia',         code: 'SA', subdomain: 'sa' },
  { name: 'Qatar',                code: 'QA', subdomain: 'qa' },
  { name: 'Kuwait',               code: 'KW', subdomain: 'kw' },
  { name: 'Bahrain',              code: 'BH', subdomain: 'bh' },
  { name: 'Oman',                 code: 'OM', subdomain: 'om' },
  { name: 'United Kingdom',       code: 'GB', subdomain: 'uk' },
  { name: 'United States',        code: 'US', subdomain: 'us' },
  { name: 'Germany',              code: 'DE', subdomain: 'de' },
  { name: 'Pakistan',             code: 'PK', subdomain: 'pk' },
];

// Each country gets cities; index matches COUNTRIES array
const CITIES_BY_COUNTRY: string[][] = [
  ['Dubai', 'Abu Dhabi', 'Sharjah'],                // AE
  ['Riyadh', 'Jeddah', 'Dammam'],                   // SA
  ['Doha', 'Al Wakrah'],                             // QA
  ['Kuwait City', 'Hawalli'],                         // KW
  ['Manama', 'Muharraq'],                             // BH
  ['Muscat', 'Salalah'],                              // OM
  ['London', 'Manchester', 'Birmingham'],             // GB
  ['New York', 'Los Angeles', 'Chicago'],             // US
  ['Berlin', 'Munich', 'Hamburg'],                    // DE
  ['Lahore', 'Karachi', 'Islamabad'],                // PK
];

const CATEGORIES = [
  { name: 'Restaurants',     slug: 'restaurants',     icon: '🍽️',  description: 'Dining and food service businesses' },
  { name: 'Healthcare',      slug: 'healthcare',      icon: '🏥',  description: 'Medical clinics, hospitals, and health services' },
  { name: 'Legal Services',  slug: 'legal-services',  icon: '⚖️',  description: 'Law firms and legal consultation' },
  { name: 'Education',       slug: 'education',       icon: '📚',  description: 'Schools, colleges, and tutoring centers' },
  { name: 'Real Estate',     slug: 'real-estate',     icon: '🏠',  description: 'Property agencies and real estate developers' },
  { name: 'Retail',          slug: 'retail',          icon: '🛒',  description: 'Shops and retail outlets' },
  { name: 'Technology',      slug: 'technology',      icon: '💻',  description: 'IT and software companies' },
  { name: 'Finance',         slug: 'finance',         icon: '🏦',  description: 'Banking, insurance, and financial services' },
  { name: 'Automotive',      slug: 'automotive',      icon: '🚗',  description: 'Car dealerships, garages, and automotive parts' },
  { name: 'Beauty & Spa',    slug: 'beauty-spa',      icon: '💇',  description: 'Salons, spas, and beauty parlors' },
  { name: 'Construction',    slug: 'construction',    icon: '🏗️', description: 'Building contractors and construction firms' },
  { name: 'Travel & Tourism',slug: 'travel-tourism',  icon: '✈️',  description: 'Travel agencies and tour operators' },
];

const SUBSCRIPTION_PLANS = [
  { name: 'Free Trial',      desc: 'Basic listing for 30 days',                   price: 0,      cycle: 'MONTHLY', days: 30,  features: ['Basic listing', '1 image upload'] },
  { name: 'Starter',         desc: 'Great for small businesses getting started',   price: 19.99,  cycle: 'MONTHLY', days: 30,  features: ['Up to 5 images', 'Social links', 'Basic analytics'] },
  { name: 'Professional',    desc: 'Full access for growing businesses',           price: 49.99,  cycle: 'MONTHLY', days: 30,  features: ['Unlimited images', 'Video upload', 'Priority support', 'Advanced analytics'] },
  { name: 'Enterprise',      desc: 'All features with dedicated support',          price: 149.99, cycle: 'MONTHLY', days: 30,  features: ['Everything in Professional', 'Dedicated account manager', 'Custom branding', 'API access'] },
  { name: 'Starter Annual',  desc: 'Starter plan billed yearly',                   price: 199.99, cycle: 'YEARLY',  days: 365, features: ['Up to 5 images', 'Social links', 'Basic analytics'] },
  { name: 'Professional Annual', desc: 'Professional plan billed yearly',          price: 499.99, cycle: 'YEARLY',  days: 365, features: ['Unlimited images', 'Video upload', 'Priority support', 'Advanced analytics'] },
  { name: 'Enterprise Annual',desc: 'Enterprise plan billed yearly',              price: 1499.99, cycle: 'YEARLY', days: 365, features: ['Everything in Professional', 'Dedicated account manager', 'Custom branding', 'API access'] },
  { name: 'Basic',           desc: 'Minimal listing presence',                     price: 9.99,   cycle: 'MONTHLY', days: 30,  features: ['Basic listing', '3 images', 'Contact info'] },
  { name: 'Premium',         desc: 'Enhanced visibility and features',             price: 99.99,  cycle: 'MONTHLY', days: 30,  features: ['Everything in Professional', 'Featured listing', 'Banner ad'] },
  { name: 'Custom',          desc: 'Tailored plan for special requirements',       price: 299.99, cycle: 'MONTHLY', days: 30,  features: ['Custom negotiated features'] },
];

// Business owners (password for all: SeedUser@2026)
const BUSINESS_OWNERS = [
  { name: 'Ahmed Al Maktoum',   email: 'ahmed@example.com',    phone: '+971501234567' },
  { name: 'Sarah Johnson',      email: 'sarah@example.com',    phone: '+44201234567' },
  { name: 'Khalid Al Saud',     email: 'khalid@example.com',   phone: '+966501234567' },
  { name: 'Emma Williams',      email: 'emma@example.com',     phone: '+12125551234' },
  { name: 'Fatima Hassan',      email: 'fatima@example.com',   phone: '+97433001234' },
  { name: 'John Smith',         email: 'john@example.com',     phone: '+49301234567' },
  { name: 'Maria Garcia',       email: 'maria@example.com',    phone: '+12125559876' },
  { name: 'Ali Raza',           email: 'ali@example.com',      phone: '+923001234567' },
  { name: 'Noor Baksh',         email: 'noor@example.com',     phone: '+96521234567' },
  { name: 'Yuki Tanaka',        email: 'yuki@example.com',     phone: '+973321234567' },
  { name: 'David Chen',         email: 'david@example.com',    phone: '+44207654321' },
  { name: 'Layla Abdulaziz',    email: 'layla@example.com',    phone: '+96891234567' },
];

const BUSINESSES = [
  { name: 'Gulf Star Restaurant',      desc: 'Authentic Middle Eastern cuisine in the heart of Dubai',              email: 'info@gulfstar.ae',       phone: '+97142345678',  website: 'https://gulfstar.ae',       address: '123 Sheikh Zayed Road, Downtown Dubai', countryIdx: 0, cityIdx: 0, catIdx: 0, ownerIdx: 0, approved: true },
  { name: 'London Tech Hub',           desc: 'Co-working space and tech incubator for startups',                    email: 'hello@londontechhub.uk', phone: '+442071230000', website: 'https://londontechhub.co.uk', address: '45 Shoreditch High St, London E1 6JJ', countryIdx: 6, cityIdx: 0, catIdx: 6, ownerIdx: 1, approved: true },
  { name: 'Riyadh Legal Advisors',     desc: 'Full-service law firm specializing in commercial and corporate law',  email: 'info@riyadhlegal.sa',    phone: '+966112345678', website: 'https://riyadhlegal.sa',     address: 'King Fahad Road, Riyadh', countryIdx: 1, cityIdx: 0, catIdx: 2, ownerIdx: 2, approved: true },
  { name: 'Manhattan Realty Group',     desc: 'Premium real estate services in New York City',                       email: 'info@manhattanrealty.com',phone: '+12125550001', website: 'https://manhattanrealty.com', address: '350 5th Avenue, Suite 4500, NYC', countryIdx: 7, cityIdx: 0, catIdx: 4, ownerIdx: 3, approved: true },
  { name: 'Doha Education Center',     desc: 'Leading tutoring and exam preparation center',                        email: 'info@dohaedu.qa',        phone: '+97444123456', website: 'https://dohaedu.qa',         address: 'West Bay, Doha', countryIdx: 2, cityIdx: 0, catIdx: 3, ownerIdx: 4, approved: true },
  { name: 'Berlin Auto Haus',          desc: 'Premium German automotive dealership and service center',             email: 'sales@berlinauto.de',    phone: '+493012345678', website: 'https://berlinauto.de',     address: 'Friedrichstraße 123, Berlin', countryIdx: 8, cityIdx: 0, catIdx: 8, ownerIdx: 5, approved: true },
  { name: 'NYC Beauty Lounge',         desc: 'Luxury beauty salon and spa experiences',                             email: 'book@nycbeauty.com',     phone: '+12125559999', website: 'https://nycbeauty.com',     address: '789 Madison Avenue, NYC', countryIdx: 7, cityIdx: 0, catIdx: 9, ownerIdx: 6, approved: true },
  { name: 'Lahore Builders Co.',       desc: 'Residential and commercial construction services',                    email: 'info@lahorebuilders.pk', phone: '+924235001234', website: 'https://lahorebuilders.pk', address: 'Gulberg III, Main Boulevard, Lahore', countryIdx: 9, cityIdx: 0, catIdx: 10, ownerIdx: 7, approved: true },
  { name: 'Kuwait Finance Advisory',   desc: 'Investment banking and wealth management services',                   email: 'info@kwfinance.kw',      phone: '+96522345678', website: 'https://kwfinance.kw',      address: 'Sharq, Arabian Gulf Street, Kuwait City', countryIdx: 3, cityIdx: 0, catIdx: 7, ownerIdx: 8, approved: true },
  { name: 'Bahrain Health Clinic',     desc: 'Multi-specialty medical clinic with modern facilities',               email: 'care@bhhealth.bh',       phone: '+97317345678', website: 'https://bhhealth.bh',       address: 'Exhibition Road, Manama', countryIdx: 4, cityIdx: 0, catIdx: 1, ownerIdx: 9, approved: true },
  { name: 'Manchester Retail Store',   desc: 'Fashion and lifestyle retail outlet',                                 email: 'shop@manchesterretail.uk', phone: '+441612345678', website: 'https://manchesterretail.uk', address: 'Market Street, Manchester M1', countryIdx: 6, cityIdx: 1, catIdx: 5, ownerIdx: 10, approved: false },
  { name: 'Muscat Travel & Tours',     desc: 'Explore Oman with our guided tours and travel packages',              email: 'info@muscattravel.om',   phone: '+96824345678', website: 'https://muscattravel.om',   address: 'Al Qurum, Muscat', countryIdx: 5, cityIdx: 0, catIdx: 11, ownerIdx: 11, approved: false },
];

// ── Main seed function ──────────────────────────────────────────────────────
async function seedSampleData() {
  console.log('══════════════════════════════════════════════════');
  console.log('  📦  COMPREHENSIVE DATABASE SEED');
  console.log('══════════════════════════════════════════════════\n');

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const qr = AppDataSource.createQueryRunner();

  try {
    // ────────────────────────────────────────────────────
    // PHASE 0: Clean dependent tables (reverse FK order)
    // ────────────────────────────────────────────────────
    console.log('🗑️  Cleaning existing sample data...');
    const cleanTables = [
      'audit_logs',
      'notifications_log',
      'payments',
      'subscriptions',
      'business_related',
      'reviews',
      'business_media',
      'business_cards',
      'business_branches',
      'business_products',
      'business_services',
      'business_hours',
      'business_socials',
      'business_categories',
      'business_gallery_images',
      'businesses',
      'refresh_tokens',
      'cities',
    ];
    for (const t of cleanTables) {
      try { await qr.query(`DELETE FROM "${t}"`); } catch { /* table may not exist */ }
    }
    // Clean sample users (keep the super admin)
    await qr.query(`DELETE FROM "user_permissions" WHERE user_id IN (SELECT id FROM "users" WHERE email LIKE '%@example.com')`);
    await qr.query(`DELETE FROM "users" WHERE email LIKE '%@example.com'`);
    // Clean sample categories (they may have different slugs from production)
    await qr.query(`DELETE FROM "categories"`);
    // Clean countries and plans — we re-insert our own set
    await qr.query(`DELETE FROM "countries"`);
    await qr.query(`DELETE FROM "subscription_plans"`);
    console.log('   ✅ Cleaned.\n');

    // ────────────────────────────────────────────────────
    // PHASE 1: Independent tables (no FK deps)
    // ────────────────────────────────────────────────────

    // 1a) Countries
    console.log('🌍 Seeding countries...');
    const countryIds: string[] = [];
    for (const c of COUNTRIES) {
      const r = await qr.query(
        `INSERT INTO "countries" (name, country_code, subdomain, is_active)
         VALUES ($1, $2, $3, true)
         RETURNING id`,
        [c.name, c.code, c.subdomain],
      );
      countryIds.push(r[0].id);
      console.log(`   + ${c.name} (${c.code})`);
    }

    // 1b) Categories
    console.log('\n📂 Seeding categories...');
    const catIds: string[] = [];
    for (const cat of CATEGORIES) {
      const r = await qr.query(
        `INSERT INTO "categories" (name, slug, icon, description, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id`,
        [cat.name, cat.slug, cat.icon, cat.description],
      );
      catIds.push(r[0].id);
      console.log(`   + ${cat.name}`);
    }

    // 1c) Subscription Plans
    console.log('\n💰 Seeding subscription plans...');
    const planIds: string[] = [];
    for (const p of SUBSCRIPTION_PLANS) {
      const r = await qr.query(
        `INSERT INTO "subscription_plans" (name, description, price, billing_cycle, duration_in_days, features, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id`,
        [p.name, p.desc, p.price, p.cycle, p.days, p.features],
      );
      planIds.push(r[0].id);
      console.log(`   + ${p.name} — $${p.price}/${p.cycle}`);
    }

    // ────────────────────────────────────────────────────
    // PHASE 2: Users (FK → roles)
    // ────────────────────────────────────────────────────
    console.log('\n👥 Seeding business owner users...');
    // Get the business_owner role (created by seed:all)
    let [boRole] = await qr.query(`SELECT id FROM "roles" WHERE name = 'business_owner'`);
    if (!boRole) {
      // Fallback: create it
      [boRole] = await qr.query(
        `INSERT INTO "roles" (name, description) VALUES ('business_owner', 'Business owner role') RETURNING id`,
      );
    }
    const boRoleId = boRole.id;

    const hashedPw = await bcrypt.hash('SeedUser@2026', BCRYPT_SALT_ROUNDS);
    const userIds: string[] = [];
    for (const u of BUSINESS_OWNERS) {
      const r = await qr.query(
        `INSERT INTO "users" (name, email, password_hash, phone, role_id, is_verified, is_active, email_verified_at)
         VALUES ($1, $2, $3, $4, $5, true, true, NOW())
         RETURNING id`,
        [u.name, u.email, hashedPw, u.phone, boRoleId],
      );
      userIds.push(r[0].id);
      console.log(`   + ${u.name} <${u.email}>`);
    }

    // ────────────────────────────────────────────────────
    // PHASE 3: Cities (FK → countries)
    // ────────────────────────────────────────────────────
    console.log('\n🏙️  Seeding cities...');
    // cityMap[countryIndex][cityIndex] = cityId
    const cityMap: string[][] = [];
    for (let ci = 0; ci < COUNTRIES.length; ci++) {
      cityMap[ci] = [];
      for (const cityName of CITIES_BY_COUNTRY[ci]) {
        const r = await qr.query(
          `INSERT INTO "cities" (name, country_id, is_active) VALUES ($1, $2, true) RETURNING id`,
          [cityName, countryIds[ci]],
        );
        cityMap[ci].push(r[0].id);
        console.log(`   + ${cityName} (${COUNTRIES[ci].code})`);
      }
    }

    // ────────────────────────────────────────────────────
    // PHASE 4: Businesses (FK → users, countries, cities, categories)
    // ────────────────────────────────────────────────────
    console.log('\n🏢 Seeding businesses...');
    const bizIds: string[] = [];
    for (const b of BUSINESSES) {
      const r = await qr.query(
        `INSERT INTO "businesses" (name, description, email, phone, website, address, user_id, country_id, city_id, category_id, is_approved, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
         RETURNING id`,
        [
          b.name, b.desc, b.email, b.phone, b.website, b.address,
          userIds[b.ownerIdx],
          countryIds[b.countryIdx],
          cityMap[b.countryIdx][b.cityIdx],
          catIds[b.catIdx],
          b.approved,
        ],
      );
      bizIds.push(r[0].id);
      console.log(`   + ${b.name} [${b.approved ? 'Approved' : 'Pending'}]`);
    }

    // ────────────────────────────────────────────────────
    // PHASE 5: Business child tables
    // ────────────────────────────────────────────────────

    // 5a) Business Socials
    console.log('\n🔗 Seeding business socials...');
    const socialTypes = ['facebook', 'instagram', 'linkedin', 'youtube', 'x'];
    for (let i = 0; i < bizIds.length; i++) {
      const numSocials = 2 + (i % 4); // 2-5 socials per business
      for (let s = 0; s < numSocials; s++) {
        const sType = socialTypes[s % socialTypes.length];
        await qr.query(
          `INSERT INTO "business_socials" (business_id, type, url) VALUES ($1, $2, $3)`,
          [bizIds[i], sType, `https://${sType}.com/${BUSINESSES[i].name.toLowerCase().replace(/\s+/g, '')}`],
        );
      }
    }
    console.log(`   ✅ Inserted socials for ${bizIds.length} businesses.`);

    // 5b) Business Hours
    console.log('\n🕐 Seeding business hours...');
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    for (const bizId of bizIds) {
      for (const day of days) {
        const isClosed = day === 'sun';
        await qr.query(
          `INSERT INTO "business_hours" (business_id, day_of_week, open_time, close_time, is_closed)
           VALUES ($1, $2, $3, $4, $5)`,
          [bizId, day, isClosed ? '00:00' : '09:00', isClosed ? '00:00' : '18:00', isClosed],
        );
      }
    }
    console.log(`   ✅ Inserted 7 days × ${bizIds.length} businesses = ${7 * bizIds.length} records.`);

    // 5c) Business Services
    console.log('\n🛠️  Seeding business services...');
    const serviceTemplates = [
      ['Dine-In Service', 'Full dining experience', 0],
      ['Consultation', 'One-on-one expert consultation', 150],
      ['Installation', 'Professional installation service', 500],
      ['Maintenance', 'Regular maintenance and checkups', 200],
      ['Training', 'Hands-on training program', 300],
      ['Custom Design', 'Bespoke design service', 750],
      ['Home Delivery', 'Door-to-door delivery', 25],
      ['Online Booking', 'Reserve service slots online', 0],
      ['Emergency Support', '24/7 emergency assistance', 400],
      ['Annual Inspection', 'Yearly comprehensive inspection', 600],
    ];
    for (let i = 0; i < bizIds.length; i++) {
      const count = 3 + (i % 4); // 3-6 services per business
      for (let s = 0; s < count; s++) {
        const tmpl = serviceTemplates[(i + s) % serviceTemplates.length];
        await qr.query(
          `INSERT INTO "business_services" (business_id, title, description, price) VALUES ($1, $2, $3, $4)`,
          [bizIds[i], tmpl[0], tmpl[1], tmpl[2] || null],
        );
      }
    }
    console.log(`   ✅ Inserted services for ${bizIds.length} businesses.`);

    // 5d) Business Products
    console.log('\n📦 Seeding business products...');
    const productTemplates = [
      ['Premium Package', 'Our best-selling premium package', 299.99],
      ['Standard Bundle', 'Great value standard bundle', 149.99],
      ['Basic Kit', 'Essential starter kit', 49.99],
      ['Deluxe Set', 'Comprehensive deluxe collection', 499.99],
      ['Gift Card', 'Redeemable gift card', 100.00],
      ['Accessories Pack', 'Complementary accessories', 79.99],
      ['VIP Pass', 'Exclusive VIP membership card', 999.99],
      ['Sample Box', 'Try before you buy sample box', 29.99],
      ['Seasonal Special', 'Limited edition seasonal offering', 199.99],
      ['Starter Pack', 'Perfect for beginners', 59.99],
    ];
    for (let i = 0; i < bizIds.length; i++) {
      const count = 2 + (i % 3); // 2-4 products per business
      for (let p = 0; p < count; p++) {
        const tmpl = productTemplates[(i + p) % productTemplates.length];
        await qr.query(
          `INSERT INTO "business_products" (business_id, name, description, price, sort_order) VALUES ($1, $2, $3, $4, $5)`,
          [bizIds[i], tmpl[0], tmpl[1], tmpl[2], p],
        );
      }
    }
    console.log(`   ✅ Inserted products for ${bizIds.length} businesses.`);

    // 5e) Business Branches
    console.log('\n📍 Seeding business branches...');
    for (let i = 0; i < bizIds.length; i++) {
      const b = BUSINESSES[i];
      const countryCities = cityMap[b.countryIdx];
      // Each business gets 1-2 branches in other cities of the same country
      const numBranches = Math.min(2, countryCities.length - 1);
      for (let br = 0; br < numBranches; br++) {
        const branchCityIdx = (b.cityIdx + br + 1) % countryCities.length;
        await qr.query(
          `INSERT INTO "business_branches" (business_id, city_id, address, phone, operating_hours)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            bizIds[i],
            countryCities[branchCityIdx],
            `Branch ${br + 1}, ${CITIES_BY_COUNTRY[b.countryIdx][branchCityIdx]}`,
            b.phone.slice(0, -1) + (br + 1),
            'Mon-Fri: 09:00-18:00, Sat: 10:00-14:00',
          ],
        );
      }
    }
    console.log(`   ✅ Inserted branches for ${bizIds.length} businesses.`);

    // 5f) Business Cards (one per business)
    console.log('\n🪪 Seeding business cards...');
    for (let i = 0; i < bizIds.length; i++) {
      await qr.query(
        `INSERT INTO "business_cards" (business_id, card_url, file_type) VALUES ($1, $2, $3)`,
        [bizIds[i], `https://storage.example.com/cards/${BUSINESSES[i].name.toLowerCase().replace(/\s+/g, '-')}-card.png`, 'image'],
      );
    }
    console.log(`   ✅ Inserted ${bizIds.length} business cards.`);

    // 5g) Business Media (multiple per business)
    console.log('\n🖼️  Seeding business media...');
    for (let i = 0; i < bizIds.length; i++) {
      const slug = BUSINESSES[i].name.toLowerCase().replace(/\s+/g, '-');
      // 3 images + 1 video per business
      for (let m = 0; m < 3; m++) {
        await qr.query(
          `INSERT INTO "business_media" (business_id, media_type, media_url, sort_order) VALUES ($1, $2, $3, $4)`,
          [bizIds[i], 'image', `https://storage.example.com/media/${slug}/gallery-${m + 1}.jpg`, m],
        );
      }
      await qr.query(
        `INSERT INTO "business_media" (business_id, media_type, media_url, sort_order) VALUES ($1, $2, $3, $4)`,
        [bizIds[i], 'video', `https://www.youtube.com/watch?v=dQw4w9WgXcQ`, 3],
      );
    }
    console.log(`   ✅ Inserted 4 media items × ${bizIds.length} businesses.`);

    // ────────────────────────────────────────────────────
    // PHASE 6: Reviews (FK → businesses, users)
    // ────────────────────────────────────────────────────
    console.log('\n⭐ Seeding reviews...');
    const reviewComments = [
      'Excellent service! Highly recommended.',
      'Very professional and punctual. Will use again.',
      'Good experience overall, but could improve communication.',
      'Outstanding quality. One of the best in the city.',
      'Average service. Nothing special but gets the job done.',
      'Great value for money. Exceeded my expectations.',
      'Friendly staff and clean premises. Very satisfied.',
      'Would not recommend. Poor customer service.',
      'Top-notch professionals. Five stars all the way.',
      'Decent experience. Could use some improvement in speed.',
      'Fantastic place! The ambiance is wonderful.',
      'Very knowledgeable team. Solved my problem quickly.',
    ];
    let reviewCount = 0;
    for (let i = 0; i < bizIds.length; i++) {
      // Each business gets 2-4 reviews from different users
      const numReviews = 2 + (i % 3);
      for (let r = 0; r < numReviews; r++) {
        const reviewerIdx = (i + r + 1) % userIds.length;
        const rating = 3 + (i + r) % 3; // ratings 3-5
        await qr.query(
          `INSERT INTO "reviews" (business_id, user_id, author_name, rating, comment)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            bizIds[i],
            userIds[reviewerIdx],
            BUSINESS_OWNERS[reviewerIdx].name,
            rating,
            reviewComments[(i + r) % reviewComments.length],
          ],
        );
        reviewCount++;
      }
    }
    console.log(`   ✅ Inserted ${reviewCount} reviews.`);

    // ────────────────────────────────────────────────────
    // PHASE 7: Enterprise Related (FK → businesses × businesses)
    // ────────────────────────────────────────────────────
    console.log('\n🔀 Seeding related businesses...');
    let relatedCount = 0;
    for (let i = 0; i < bizIds.length - 1; i++) {
      // Link each business to the next one
      await qr.query(
        `INSERT INTO "business_related" (business_id, related_business_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [bizIds[i], bizIds[i + 1]],
      );
      relatedCount++;
    }
    // Also link last to first to create a loop
    await qr.query(
      `INSERT INTO "business_related" (business_id, related_business_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [bizIds[bizIds.length - 1], bizIds[0]],
    );
    relatedCount++;
    console.log(`   ✅ Inserted ${relatedCount} related business links.`);

    // ────────────────────────────────────────────────────
    // PHASE 8: Subscriptions (FK → businesses, plans)
    // ────────────────────────────────────────────────────
    console.log('\n📋 Seeding subscriptions...');
    const subsIds: string[] = [];
    const subStatuses = ['active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'expired', 'active', 'pending', 'pending'];
    for (let i = 0; i < bizIds.length; i++) {
      const planIdx = i % planIds.length;
      const status = subStatuses[i];
      const startD = status === 'expired' ? pastDate(60) : pastDate(15);
      const endD = status === 'expired' ? pastDate(1) : futureDate(status === 'pending' ? 30 : 15);

      const r = await qr.query(
        `INSERT INTO "subscriptions" (business_id, plan_id, stripe_subscription_id, start_date, end_date, status, auto_renew)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          bizIds[i],
          planIds[planIdx],
          `sub_seed_${i + 1}_${Date.now()}`,
          startD,
          endD,
          status,
          status === 'active',
        ],
      );
      subsIds.push(r[0].id);
      console.log(`   + ${BUSINESSES[i].name} → ${SUBSCRIPTION_PLANS[planIdx].name} [${status}]`);
    }

    // ────────────────────────────────────────────────────
    // PHASE 9: Payments (FK → subscriptions)
    // ────────────────────────────────────────────────────
    console.log('\n💳 Seeding payments...');
    let paymentCount = 0;
    for (let i = 0; i < subsIds.length; i++) {
      const plan = SUBSCRIPTION_PLANS[i % planIds.length];
      // Each subscription has 1-3 payment records
      const numPayments = 1 + (i % 3);
      for (let p = 0; p < numPayments; p++) {
        const status = p === 0 ? 'success' : (Math.random() > 0.8 ? 'failed' : 'success');
        await qr.query(
          `INSERT INTO "payments" (subscription_id, stripe_payment_intent, amount, currency, status, invoice_url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            subsIds[i],
            `pi_seed_${i}_${p}_${Date.now()}`,
            plan.price,
            'usd',
            status,
            status === 'success' ? `https://invoice.stripe.com/i/seed_${i}_${p}` : null,
          ],
        );
        paymentCount++;
      }
    }
    console.log(`   ✅ Inserted ${paymentCount} payments.`);

    // ────────────────────────────────────────────────────
    // PHASE 10: Notifications Log (FK → users)
    // ────────────────────────────────────────────────────
    console.log('\n📬 Seeding notification logs...');
    const notifTypes = ['registration', 'listing_approved', 'listing_rejected', 'payment_confirmed', 'payment_failed', 'subscription_expiry_7d', 'subscription_expiry_1d', 'subscription_expired', 'password_reset', 'admin_broadcast'];
    const notifTemplates = [
      'verify-email',
      'listing-approved',
      'listing-rejected',
      'payment-receipt',
      'payment-failed',
      'subscription-expiry-reminder',
      'subscription-expiry-reminder',
      'subscription-expired',
      'password-reset',
      'broadcast',
    ];
    const notifSubjects = [
      'Welcome to Digital Directory!',
      'Your listing has been approved',
      'Your listing requires changes',
      'Payment confirmation',
      'Payment failed — action required',
      'Subscription expiring in 7 days',
      'Subscription expiring tomorrow',
      'Your subscription has expired',
      'Password reset request',
      'Important platform announcement',
    ];
    let notifCount = 0;
    for (let i = 0; i < userIds.length; i++) {
      // Each user gets 2-3 notification records
      const num = 2 + (i % 2);
      for (let n = 0; n < num; n++) {
        const typeIdx = (i + n) % notifTypes.length;
        const status = n === 0 ? 'sent' : (Math.random() > 0.9 ? 'failed' : 'sent');
        await qr.query(
          `INSERT INTO "notifications_log" (user_id, type, channel, status, sent_at, recipient_email, subject, template_name, context_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            userIds[i],
            notifTypes[typeIdx],
            'email',
            status,
            status === 'sent' ? randomDate(new Date('2026-01-01'), new Date()) : null,
            BUSINESS_OWNERS[i].email,
            notifSubjects[typeIdx],
            notifTemplates[typeIdx],
            JSON.stringify({ userName: BUSINESS_OWNERS[i].name }),
          ],
        );
        notifCount++;
      }
    }
    console.log(`   ✅ Inserted ${notifCount} notification logs.`);

    // ────────────────────────────────────────────────────
    // PHASE 11: Audit Logs (FK → users)
    // ────────────────────────────────────────────────────
    console.log('\n📜 Seeding audit logs...');
    const auditActions = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'SUSPEND', 'ACTIVATE', 'EXPORT'];
    const auditResources = ['business', 'user', 'subscription', 'payment', 'category', 'country', 'city', 'plan', 'review', 'notification'];
    let auditCount = 0;

    // Get super admin user id for admin actions
    const [saUser] = await qr.query(`SELECT id FROM "users" WHERE email = 'ramzanhusnain7194@gmail.com'`);
    const saUserId = saUser?.id || userIds[0];

    for (let i = 0; i < 15; i++) {
      const userId = i < 5 ? saUserId : userIds[i % userIds.length];
      const action = auditActions[i % auditActions.length];
      const resource = auditResources[i % auditResources.length];
      await qr.query(
        `INSERT INTO "audit_logs" (user_id, action, resource, resource_id, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          action,
          resource,
          bizIds[i % bizIds.length],
          JSON.stringify({ note: `Sample ${action.toLowerCase()} action on ${resource}`, seedData: true }),
          i < 5 ? '192.168.1.1' : `10.0.${Math.floor(i / 256)}.${i % 256}`,
          'Mozilla/5.0 (Seed Script)',
        ],
      );
      auditCount++;
    }
    console.log(`   ✅ Inserted ${auditCount} audit logs.`);

    // ────────────────────────────────────────────────────
    // PHASE 12: Refresh Tokens (FK → users) — sample expired ones
    // ────────────────────────────────────────────────────
    console.log('\n🔑 Seeding refresh tokens...');
    for (let i = 0; i < 10; i++) {
      await qr.query(
        `INSERT INTO "refresh_tokens" (user_id, token, expires_at, is_revoked)
         VALUES ($1, $2, $3, $4)`,
        [
          userIds[i % userIds.length],
          `seed_refresh_token_${i}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          randomDate(new Date('2026-01-01'), new Date('2026-06-01')),
          i < 5, // first 5 are revoked (expired sessions)
        ],
      );
    }
    console.log(`   ✅ Inserted 10 refresh tokens.`);

    // ────────────────────────────────────────────────────
    // PHASE 13: User Permissions (FK → users, permissions)
    // ────────────────────────────────────────────────────
    console.log('\n🔐 Seeding user-level permissions...');
    const perms = await qr.query(`SELECT id, name FROM "permissions" ORDER BY resource, action LIMIT 20`);
    if (perms.length > 0) {
      let upCount = 0;
      // Give each user 2-3 direct permissions
      for (let i = 0; i < Math.min(userIds.length, 10); i++) {
        const numPerms = 2 + (i % 2);
        for (let p = 0; p < numPerms; p++) {
          const perm = perms[(i + p) % perms.length];
          await qr.query(
            `INSERT INTO "user_permissions" (user_id, permission_id) VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [userIds[i], perm.id],
          );
          upCount++;
        }
      }
      console.log(`   ✅ Inserted ${upCount} user permissions.`);
    } else {
      console.log('   ⚠️ No permissions found — run seed:all first.');
    }

    // ────────────────────────────────────────────────────
    // SUMMARY
    // ────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════════');
    console.log('  ✅  SEED COMPLETE — Summary');
    console.log('══════════════════════════════════════════════════');
    console.log(`  Countries:         ${COUNTRIES.length}`);
    console.log(`  Cities:            ${CITIES_BY_COUNTRY.flat().length}`);
    console.log(`  Categories:        ${CATEGORIES.length}`);
    console.log(`  Subscription Plans:${SUBSCRIPTION_PLANS.length}`);
    console.log(`  Users (owners):    ${BUSINESS_OWNERS.length}`);
    console.log(`  Businesses:        ${BUSINESSES.length}`);
    console.log(`  Business Socials:  ~${bizIds.length * 3}`);
    console.log(`  Business Hours:    ${bizIds.length * 7}`);
    console.log(`  Business Services: ~${bizIds.length * 4}`);
    console.log(`  Business Products: ~${bizIds.length * 3}`);
    console.log(`  Business Branches: ~${bizIds.length * 1}`);
    console.log(`  Business Cards:    ${bizIds.length}`);
    console.log(`  Business Media:    ${bizIds.length * 4}`);
    console.log(`  Reviews:           ${reviewCount}`);
    console.log(`  Related Businesses:${relatedCount}`);
    console.log(`  Subscriptions:     ${subsIds.length}`);
    console.log(`  Payments:          ${paymentCount}`);
    console.log(`  Notification Logs: ${notifCount}`);
    console.log(`  Audit Logs:        ${auditCount}`);
    console.log(`  Refresh Tokens:    10`);
    console.log(`  User Permissions:  ~${Math.min(userIds.length, 10) * 2}`);
    console.log('══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    throw error;
  } finally {
    await qr.release();
    await AppDataSource.destroy();
  }
}

// ── Execute ─────────────────────────────────────────────────────────────────
seedSampleData().catch(() => process.exit(1));
