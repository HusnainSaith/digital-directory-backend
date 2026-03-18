import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterCountriesToSRS1742000000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename code -> country_code
    await queryRunner.query(`ALTER TABLE "countries" RENAME COLUMN "code" TO "country_code"`);

    // Change name length to VARCHAR(100)
    await queryRunner.query(`ALTER TABLE "countries" ALTER COLUMN "name" TYPE VARCHAR(100)`);

    // Change subdomain length to VARCHAR(50)
    await queryRunner.query(`ALTER TABLE "countries" ALTER COLUMN "subdomain" TYPE VARCHAR(50)`);

    // Drop columns not in SRS
    await queryRunner.query(`ALTER TABLE "countries" DROP COLUMN IF EXISTS "slug"`);
    await queryRunner.query(`ALTER TABLE "countries" DROP COLUMN IF EXISTS "currency"`);
    await queryRunner.query(`ALTER TABLE "countries" DROP COLUMN IF EXISTS "timezone"`);
    await queryRunner.query(`ALTER TABLE "countries" DROP COLUMN IF EXISTS "flag_url"`);
    await queryRunner.query(`ALTER TABLE "countries" DROP COLUMN IF EXISTS "created_at"`);
    await queryRunner.query(`ALTER TABLE "countries" DROP COLUMN IF EXISTS "updated_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "countries" ADD COLUMN "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "countries" ADD COLUMN "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "countries" ADD COLUMN "flag_url" VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE "countries" ADD COLUMN "timezone" VARCHAR(50)`);
    await queryRunner.query(`ALTER TABLE "countries" ADD COLUMN "currency" VARCHAR(10)`);
    await queryRunner.query(`ALTER TABLE "countries" ADD COLUMN "slug" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "countries" ALTER COLUMN "subdomain" TYPE VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE "countries" ALTER COLUMN "name" TYPE VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "countries" RENAME COLUMN "country_code" TO "code"`);
  }
}
