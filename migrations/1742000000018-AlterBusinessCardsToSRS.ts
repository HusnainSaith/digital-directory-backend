import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterBusinessCardsToSRS1742000000018 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the ENUM type for file_type
    await queryRunner.query(`CREATE TYPE "card_file_type_enum" AS ENUM('image', 'pdf')`);

    // Add new SRS columns
    await queryRunner.query(`ALTER TABLE "business_cards" ADD COLUMN "card_url" TEXT NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "business_cards" ADD COLUMN "file_type" "card_file_type_enum" NOT NULL DEFAULT 'image'`);

    // Migrate existing data: prefer card_image_url, fallback to card_pdf_url
    await queryRunner.query(`
      UPDATE "business_cards" SET
        "card_url" = COALESCE("card_image_url", "card_pdf_url", ''),
        "file_type" = CASE WHEN "card_pdf_url" IS NOT NULL AND "card_image_url" IS NULL THEN 'pdf'::card_file_type_enum ELSE 'image'::card_file_type_enum END
    `);

    // Drop old columns
    await queryRunner.query(`ALTER TABLE "business_cards" DROP COLUMN IF EXISTS "card_image_url"`);
    await queryRunner.query(`ALTER TABLE "business_cards" DROP COLUMN IF EXISTS "card_pdf_url"`);
    await queryRunner.query(`ALTER TABLE "business_cards" DROP COLUMN IF EXISTS "card_data"`);
    await queryRunner.query(`ALTER TABLE "business_cards" DROP COLUMN IF EXISTS "updated_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "business_cards" ADD COLUMN "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "business_cards" ADD COLUMN "card_data" JSONB`);
    await queryRunner.query(`ALTER TABLE "business_cards" ADD COLUMN "card_pdf_url" VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE "business_cards" ADD COLUMN "card_image_url" VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE "business_cards" DROP COLUMN IF EXISTS "file_type"`);
    await queryRunner.query(`ALTER TABLE "business_cards" DROP COLUMN IF EXISTS "card_url"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "card_file_type_enum"`);
  }
}
