import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterBusinessBranchesToSRS1742000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make address NOT NULL (with default for existing nulls)
    await queryRunner.query(`UPDATE "business_branches" SET "address" = '' WHERE "address" IS NULL`);
    await queryRunner.query(`ALTER TABLE "business_branches" ALTER COLUMN "address" SET NOT NULL`);

    // Drop columns not in SRS
    await queryRunner.query(`ALTER TABLE "business_branches" DROP COLUMN IF EXISTS "name"`);
    await queryRunner.query(`ALTER TABLE "business_branches" DROP COLUMN IF EXISTS "contact"`);
    await queryRunner.query(`ALTER TABLE "business_branches" DROP COLUMN IF EXISTS "updated_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "business_branches" ADD COLUMN "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "business_branches" ADD COLUMN "contact" VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE "business_branches" ADD COLUMN "name" VARCHAR(255) NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "business_branches" ALTER COLUMN "address" DROP NOT NULL`);
  }
}
