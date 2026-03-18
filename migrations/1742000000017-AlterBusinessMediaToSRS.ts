import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterBusinessMediaToSRS1742000000017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the ENUM type for media_type
    await queryRunner.query(`CREATE TYPE "media_type_enum" AS ENUM('image', 'video')`);

    // Change media_type from varchar to ENUM
    await queryRunner.query(`ALTER TABLE "business_media" ALTER COLUMN "media_type" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "business_media" ALTER COLUMN "media_type" TYPE "media_type_enum" USING "media_type"::"media_type_enum"`);
    await queryRunner.query(`ALTER TABLE "business_media" ALTER COLUMN "media_type" SET NOT NULL`);

    // Rename url -> media_url, change to TEXT
    await queryRunner.query(`ALTER TABLE "business_media" RENAME COLUMN "url" TO "media_url"`);
    await queryRunner.query(`ALTER TABLE "business_media" ALTER COLUMN "media_url" TYPE TEXT`);

    // Drop columns not in SRS
    await queryRunner.query(`ALTER TABLE "business_media" DROP COLUMN IF EXISTS "alt"`);
    await queryRunner.query(`ALTER TABLE "business_media" DROP COLUMN IF EXISTS "title"`);
    await queryRunner.query(`ALTER TABLE "business_media" DROP COLUMN IF EXISTS "file_size"`);
    await queryRunner.query(`ALTER TABLE "business_media" DROP COLUMN IF EXISTS "mime_type"`);
    await queryRunner.query(`ALTER TABLE "business_media" DROP COLUMN IF EXISTS "r2_key"`);
    await queryRunner.query(`ALTER TABLE "business_media" DROP COLUMN IF EXISTS "updated_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "business_media" ADD COLUMN "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "business_media" ADD COLUMN "r2_key" VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE "business_media" ADD COLUMN "mime_type" VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE "business_media" ADD COLUMN "file_size" INTEGER`);
    await queryRunner.query(`ALTER TABLE "business_media" ADD COLUMN "title" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "business_media" ADD COLUMN "alt" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "business_media" ALTER COLUMN "media_url" TYPE VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE "business_media" RENAME COLUMN "media_url" TO "url"`);
    await queryRunner.query(`ALTER TABLE "business_media" ALTER COLUMN "media_type" TYPE VARCHAR(20) USING "media_type"::TEXT`);
    await queryRunner.query(`ALTER TABLE "business_media" ALTER COLUMN "media_type" SET DEFAULT 'image'`);
    await queryRunner.query(`DROP TYPE IF EXISTS "media_type_enum"`);
  }
}
