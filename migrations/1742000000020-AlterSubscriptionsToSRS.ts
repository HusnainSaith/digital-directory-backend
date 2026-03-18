import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterSubscriptionsToSRS1742000000020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create subscription status ENUM
    await queryRunner.query(`CREATE TYPE "subscription_status_enum" AS ENUM('active', 'expired', 'cancelled', 'pending')`);

    // Add start_date and end_date
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN "start_date" DATE NOT NULL DEFAULT CURRENT_DATE`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN "end_date" DATE NOT NULL DEFAULT CURRENT_DATE`);

    // Migrate period data to date columns
    await queryRunner.query(`
      UPDATE "subscriptions" SET
        "start_date" = COALESCE("current_period_start"::date, CURRENT_DATE),
        "end_date" = COALESCE("current_period_end"::date, CURRENT_DATE)
    `);

    // Change status to ENUM
    await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "status" TYPE "subscription_status_enum" USING "status"::"subscription_status_enum"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "status" SET NOT NULL`);

    // Make business_id NOT NULL (set any nulls to a placeholder, then drop them if needed)
    await queryRunner.query(`DELETE FROM "subscriptions" WHERE "business_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "business_id" SET NOT NULL`);

    // Trim stripe_subscription_id to VARCHAR(100)
    await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "stripe_subscription_id" TYPE VARCHAR(100)`);

    // Drop columns not in SRS
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "user_id"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "stripe_customer_id"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "current_period_start"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "current_period_end"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "canceled_at"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "updated_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN "canceled_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN "current_period_end" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN "current_period_start" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN "stripe_customer_id" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN "user_id" UUID`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "stripe_subscription_id" TYPE VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "business_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::TEXT`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DEFAULT 'active'`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "end_date"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "start_date"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_status_enum"`);
  }
}
