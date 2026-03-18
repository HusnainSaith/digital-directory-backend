import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterCitiesToSRS1742000000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Change name length to VARCHAR(100)
    await queryRunner.query(`ALTER TABLE "cities" ALTER COLUMN "name" TYPE VARCHAR(100)`);

    // Drop columns not in SRS
    await queryRunner.query(`ALTER TABLE "cities" DROP COLUMN IF EXISTS "slug"`);
    await queryRunner.query(`ALTER TABLE "cities" DROP COLUMN IF EXISTS "region"`);
    await queryRunner.query(`ALTER TABLE "cities" DROP COLUMN IF EXISTS "hero_image"`);
    await queryRunner.query(`ALTER TABLE "cities" DROP COLUMN IF EXISTS "description"`);
    await queryRunner.query(`ALTER TABLE "cities" DROP COLUMN IF EXISTS "created_at"`);
    await queryRunner.query(`ALTER TABLE "cities" DROP COLUMN IF EXISTS "updated_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cities" ADD COLUMN "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "cities" ADD COLUMN "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "cities" ADD COLUMN "description" TEXT`);
    await queryRunner.query(`ALTER TABLE "cities" ADD COLUMN "hero_image" VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE "cities" ADD COLUMN "region" VARCHAR(255) NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "cities" ADD COLUMN "slug" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "cities" ALTER COLUMN "name" TYPE VARCHAR(255)`);
  }
}
