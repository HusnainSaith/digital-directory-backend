import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterSubscriptionPlansToSRS1742000000019 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add consolidated price column (use price_monthly as initial value)
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN "price" DECIMAL(10,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`UPDATE "subscription_plans" SET "price" = COALESCE("price_monthly", 0)`);

    // Add single stripe_price_id
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN "stripe_price_id" VARCHAR(100)`);
    await queryRunner.query(`UPDATE "subscription_plans" SET "stripe_price_id" = COALESCE("stripe_price_id_monthly", "stripe_price_id_yearly")`);

    // Change name length to VARCHAR(100)
    await queryRunner.query(`ALTER TABLE "subscription_plans" ALTER COLUMN "name" TYPE VARCHAR(100)`);

    // Drop columns not in SRS
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "slug"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "description"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "price_monthly"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "price_yearly"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "stripe_price_id_monthly"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "stripe_price_id_yearly"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "features"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "max_businesses"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "sort_order"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "created_at"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "updated_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN "sort_order" INTEGER DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN "max_businesses" INTEGER DEFAULT 1`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN "features" JSONB DEFAULT '[]'`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN "stripe_price_id_yearly" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN "stripe_price_id_monthly" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN "price_yearly" DECIMAL(10,2) DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN "price_monthly" DECIMAL(10,2) DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN "description" TEXT`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN "slug" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ALTER COLUMN "name" TYPE VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "stripe_price_id"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "price"`);
  }
}
