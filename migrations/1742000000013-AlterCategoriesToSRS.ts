import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterCategoriesToSRS1742000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Change name to VARCHAR(100) and add UNIQUE constraint
    await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "name" TYPE VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "UQ_categories_name" UNIQUE ("name")`);

    // Drop columns not in SRS
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "slug"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "icon"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "description"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "created_at"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "updated_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN "description" TEXT`);
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN "icon" VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN "slug" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "UQ_categories_name"`);
    await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "name" TYPE VARCHAR(255)`);
  }
}
