import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixMissingColumnsSchemaSync1741000000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── categories: add slug, icon, description, created_at, updated_at ──
    await queryRunner.query(
      `ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "slug" varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "icon" varchar(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "description" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT now()`,
    );
    // Back-fill slug from name for existing rows
    await queryRunner.query(
      `UPDATE "categories" SET "slug" = LOWER(REPLACE("name", ' ', '-')) WHERE "slug" IS NULL`,
    );

    // ── business_products (or enterprise_products): add price, image_url ──
    const productsTable = (await queryRunner.hasTable('business_products'))
      ? 'business_products'
      : 'enterprise_products';
    await queryRunner.query(
      `ALTER TABLE "${productsTable}" ADD COLUMN IF NOT EXISTS "price" decimal(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "${productsTable}" ADD COLUMN IF NOT EXISTS "image_url" text`,
    );

    // ── payments: add invoice_url ──
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "invoice_url" text`,
    );

    // ── notifications_log: rename recipient→recipient_email, content→context_data ──
    // Only rename if old column exists AND new column doesn't
    const recipientOldExists = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='notifications_log' AND column_name='recipient'`,
    );
    const recipientNewExists = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='notifications_log' AND column_name='recipient_email'`,
    );
    if (recipientOldExists.length > 0 && recipientNewExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "notifications_log" RENAME COLUMN "recipient" TO "recipient_email"`,
      );
    } else if (recipientOldExists.length > 0 && recipientNewExists.length > 0) {
      // Both exist — drop the old one
      await queryRunner.query(
        `ALTER TABLE "notifications_log" DROP COLUMN "recipient"`,
      );
    }

    const contentOldExists = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='notifications_log' AND column_name='content'`,
    );
    const contextNewExists = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='notifications_log' AND column_name='context_data'`,
    );
    if (contentOldExists.length > 0 && contextNewExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "notifications_log" RENAME COLUMN "content" TO "context_data"`,
      );
      await queryRunner.query(
        `ALTER TABLE "notifications_log" ALTER COLUMN "context_data" TYPE jsonb USING CASE WHEN "context_data" IS NULL THEN NULL ELSE to_jsonb("context_data") END`,
      );
    } else if (contentOldExists.length > 0 && contextNewExists.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "notifications_log" DROP COLUMN "content"`,
      );
    }
    // If context_data exists but is text, convert to jsonb
    const contextCol = await queryRunner.query(
      `SELECT data_type FROM information_schema.columns WHERE table_name='notifications_log' AND column_name='context_data'`,
    );
    if (contextCol.length > 0 && contextCol[0].data_type === 'text') {
      await queryRunner.query(
        `ALTER TABLE "notifications_log" ALTER COLUMN "context_data" TYPE jsonb USING CASE WHEN "context_data" IS NULL THEN NULL ELSE to_jsonb("context_data") END`,
      );
    }

    // subscription_plans: add description, billing_cycle, features (used by admin panel)
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "description" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "billing_cycle" varchar(20) DEFAULT 'MONTHLY'`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "features" text[]`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "slug"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "icon"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "description"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "created_at"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "updated_at"`);
    const productsTableDown = (await queryRunner.hasTable('business_products'))
      ? 'business_products'
      : 'enterprise_products';
    await queryRunner.query(`ALTER TABLE "${productsTableDown}" DROP COLUMN IF EXISTS "price"`);
    await queryRunner.query(`ALTER TABLE "${productsTableDown}" DROP COLUMN IF EXISTS "image_url"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "invoice_url"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "description"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "billing_cycle"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "features"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "created_at"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "updated_at"`);
  }
}
