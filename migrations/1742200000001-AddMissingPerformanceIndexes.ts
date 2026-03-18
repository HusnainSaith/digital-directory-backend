import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingPerformanceIndexes1742200000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix: subscription composite indexes that were skipped due to migration ordering
    // (1742000000001 ran before 1742000000020 which added end_date)
    const hasEndDate = await queryRunner.hasColumn('subscriptions', 'end_date');
    if (hasEndDate) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_subscriptions_business_status_end
        ON subscriptions (business_id, status, end_date);
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_subscriptions_status_end
        ON subscriptions (status, end_date);
      `);
    }

    // Add missing index on subscriptions.business_id (heavily queried in admin, search, businesses)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_business_id
      ON subscriptions (business_id);
    `);

    // Add missing index on payments.subscription_id (used in joins and cascades)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_subscription_id
      ON payments (subscription_id);
    `);

    // Add missing index on businesses.city_id (used in location filtering)
    const businessesExists = await queryRunner.hasTable('businesses');
    const bizTable = businessesExists ? 'businesses' : 'enterprises';

    const hasCityId = await queryRunner.hasColumn(bizTable, 'city_id');
    if (hasCityId) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_businesses_city_id
        ON "${bizTable}" (city_id);
      `);
    }

    // Add missing index on businesses.category_id (used in category filtering)
    const hasCategoryId = await queryRunner.hasColumn(bizTable, 'category_id');
    if (hasCategoryId) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_businesses_category_id
        ON "${bizTable}" (category_id);
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_subscriptions_business_status_end;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_subscriptions_status_end;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_subscriptions_business_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payments_subscription_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_businesses_city_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_businesses_category_id;`);
  }
}
