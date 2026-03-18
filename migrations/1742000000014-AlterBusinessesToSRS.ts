import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterBusinessesToSRS1742000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename owner_id -> user_id
    await queryRunner.query(`ALTER TABLE "businesses" RENAME COLUMN "owner_id" TO "user_id"`);

    // Add category_id FK (single category per business per SRS)
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "category_id" UUID`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD CONSTRAINT "FK_businesses_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL`);

    // Rename logo -> logo_url, change to TEXT
    await queryRunner.query(`ALTER TABLE "businesses" RENAME COLUMN "logo" TO "logo_url"`);
    await queryRunner.query(`ALTER TABLE "businesses" ALTER COLUMN "logo_url" TYPE TEXT`);

    // Rename contact fields to simple names
    await queryRunner.query(`ALTER TABLE "businesses" RENAME COLUMN "contact_phone" TO "phone"`);
    await queryRunner.query(`ALTER TABLE "businesses" ALTER COLUMN "phone" TYPE VARCHAR(30)`);
    await queryRunner.query(`ALTER TABLE "businesses" RENAME COLUMN "contact_email" TO "email"`);
    await queryRunner.query(`ALTER TABLE "businesses" RENAME COLUMN "contact_website" TO "website"`);
    await queryRunner.query(`ALTER TABLE "businesses" ALTER COLUMN "website" TYPE VARCHAR(300)`);

    // Add single address column (replaces 7 address_* columns)
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "address" TEXT`);

    // Change name length to VARCHAR(200)
    await queryRunner.query(`ALTER TABLE "businesses" ALTER COLUMN "name" TYPE VARCHAR(200)`);

    // Make description nullable
    await queryRunner.query(`ALTER TABLE "businesses" ALTER COLUMN "description" DROP NOT NULL`);

    // Drop slug unique constraint first
    await queryRunner.query(`ALTER TABLE "businesses" DROP CONSTRAINT IF EXISTS "UQ_enterprises_slug"`);
    await queryRunner.query(`ALTER TABLE "businesses" DROP CONSTRAINT IF EXISTS "UQ_businesses_slug"`);

    // Drop all columns not in SRS
    const dropCols = [
      'slug', 'legal_name', 'short_description', 'business_card',
      'tags', 'rating_avg', 'rating_count', 'price_range',
      'verified', 'founded_year', 'employee_range', 'certifications',
      'owner_name', 'owner_title', 'owner_bio', 'owner_photo',
      'owner_email', 'owner_linkedin',
      'address_country', 'address_city', 'address_district',
      'address_street', 'address_postal_code', 'address_lat', 'address_lng',
      'approved_at', 'rejection_reason',
    ];
    for (const col of dropCols) {
      await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "${col}"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add dropped columns
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "rejection_reason" TEXT`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "approved_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "address_lng" DECIMAL(10,7)`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "address_lat" DECIMAL(10,7)`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "address_postal_code" VARCHAR(20)`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "address_street" VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "address_district" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "address_city" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "address_country" VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "owner_linkedin" VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "owner_email" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "owner_photo" VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "owner_bio" TEXT`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "owner_title" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "owner_name" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "certifications" TEXT[] DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "employee_range" VARCHAR(50)`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "founded_year" INTEGER`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "verified" BOOLEAN DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "price_range" SMALLINT`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "rating_count" INTEGER DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "rating_avg" DECIMAL(3,2) DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "tags" TEXT[] DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "business_card" VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "short_description" TEXT NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "legal_name" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN "slug" VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD CONSTRAINT "UQ_businesses_slug" UNIQUE ("slug")`);

    // Make description NOT NULL again
    await queryRunner.query(`ALTER TABLE "businesses" ALTER COLUMN "description" SET NOT NULL`);

    // Revert name length
    await queryRunner.query(`ALTER TABLE "businesses" ALTER COLUMN "name" TYPE VARCHAR(255)`);

    // Drop address column
    await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "address"`);

    // Revert contact renames
    await queryRunner.query(`ALTER TABLE "businesses" ALTER COLUMN "website" TYPE VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE "businesses" RENAME COLUMN "website" TO "contact_website"`);
    await queryRunner.query(`ALTER TABLE "businesses" RENAME COLUMN "email" TO "contact_email"`);
    await queryRunner.query(`ALTER TABLE "businesses" ALTER COLUMN "phone" TYPE VARCHAR(50)`);
    await queryRunner.query(`ALTER TABLE "businesses" RENAME COLUMN "phone" TO "contact_phone"`);

    // Revert logo
    await queryRunner.query(`ALTER TABLE "businesses" ALTER COLUMN "logo_url" TYPE VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE "businesses" RENAME COLUMN "logo_url" TO "logo"`);

    // Drop category_id
    await queryRunner.query(`ALTER TABLE "businesses" DROP CONSTRAINT IF EXISTS "FK_businesses_category"`);
    await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "category_id"`);

    // Revert user_id -> owner_id
    await queryRunner.query(`ALTER TABLE "businesses" RENAME COLUMN "user_id" TO "owner_id"`);
  }
}
