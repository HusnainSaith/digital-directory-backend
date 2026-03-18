import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixMissingEntityColumns1742100000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // businesses: add rejection_reason
    await queryRunner.query(
      `ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT`,
    );

    // subscription_plans: add description, features, created_at, updated_at
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "description" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "features" TEXT[]`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    );

    // payments: add invoice_url
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "invoice_url" TEXT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "invoice_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "features"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "businesses" DROP COLUMN IF EXISTS "rejection_reason"`,
    );
  }
}
