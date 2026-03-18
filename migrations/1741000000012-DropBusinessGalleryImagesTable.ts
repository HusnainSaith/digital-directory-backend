import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropBusinessGalleryImagesTable1741000000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "business_gallery_images"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "business_gallery_images" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "business_id" uuid NOT NULL,
        "url" character varying NOT NULL,
        "alt" character varying,
        "sort_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_business_gallery_images" PRIMARY KEY ("id"),
        CONSTRAINT "FK_business_gallery_images_business"
          FOREIGN KEY ("business_id")
          REFERENCES "businesses" ("id")
          ON DELETE CASCADE
      )
    `);
  }
}
