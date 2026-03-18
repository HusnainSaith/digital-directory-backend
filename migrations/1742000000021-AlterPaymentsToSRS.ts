import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterPaymentsToSRS1742000000021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create payment status ENUM
    await queryRunner.query(`CREATE TYPE "payment_status_enum" AS ENUM('success', 'failed', 'refunded')`);

    // Rename stripe_payment_intent_id -> stripe_payment_intent, change type
    await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "stripe_payment_intent_id" TO "stripe_payment_intent"`);
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "stripe_payment_intent" TYPE VARCHAR(100)`);
    await queryRunner.query(`UPDATE "payments" SET "stripe_payment_intent" = 'unknown_' || id::text WHERE "stripe_payment_intent" IS NULL`);
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "stripe_payment_intent" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "UQ_payments_stripe_intent" UNIQUE ("stripe_payment_intent")`);

    // Change status to ENUM
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`
      UPDATE "payments" SET "status" = CASE
        WHEN "status" = 'pending' THEN 'failed'
        WHEN "status" IN ('success', 'failed', 'refunded') THEN "status"
        ELSE 'failed'
      END
    `);
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" TYPE "payment_status_enum" USING "status"::"payment_status_enum"`);
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" SET NOT NULL`);

    // Make subscription_id NOT NULL
    await queryRunner.query(`DELETE FROM "payments" WHERE "subscription_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "subscription_id" SET NOT NULL`);

    // Drop columns not in SRS
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "user_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "stripe_invoice_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "payment_method"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "description"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "invoice_url"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "updated_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "invoice_url" TEXT`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "description" TEXT`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "payment_method" VARCHAR(50)`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "stripe_invoice_id" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "user_id" UUID`);
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "subscription_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::TEXT`);
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'pending'`);
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "UQ_payments_stripe_intent"`);
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "stripe_payment_intent" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "stripe_payment_intent" TYPE VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "stripe_payment_intent" TO "stripe_payment_intent_id"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum"`);
  }
}
