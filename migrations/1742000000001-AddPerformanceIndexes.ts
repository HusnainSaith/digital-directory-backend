import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1742000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const businessesExists = await queryRunner.hasTable('businesses');
    const bizTable = businessesExists ? 'businesses' : 'enterprises';

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_businesses_country_approved_active
      ON "${bizTable}" (country_id, is_approved, is_active);
    `);

    // Only create end_date index if column exists
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

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_log_user_created
      ON notifications_log (user_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
      ON audit_logs (user_id, created_at DESC);
    `);

    // Only create reviews.business_id index if column exists
    const hasReviewBusinessId = await queryRunner.hasColumn('reviews', 'business_id');
    if (hasReviewBusinessId) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_reviews_business_id
        ON reviews (business_id);
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_businesses_country_approved_active;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_subscriptions_business_status_end;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_notifications_log_user_created;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_audit_logs_user_created;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reviews_business_id;`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_subscriptions_status_end;`,
    );
  }
}
