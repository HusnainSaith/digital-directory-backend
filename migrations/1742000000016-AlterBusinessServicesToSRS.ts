import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterBusinessServicesToSRS1742000000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename name -> title, change to VARCHAR(200)
    await queryRunner.query(`ALTER TABLE "business_services" RENAME COLUMN "name" TO "title"`);
    await queryRunner.query(`ALTER TABLE "business_services" ALTER COLUMN "title" TYPE VARCHAR(200)`);

    // Rename price_from -> price, change to DECIMAL(10,2)
    await queryRunner.query(`ALTER TABLE "business_services" RENAME COLUMN "price_from" TO "price"`);
    await queryRunner.query(`ALTER TABLE "business_services" ALTER COLUMN "price" TYPE DECIMAL(10,2)`);

    // Drop columns not in SRS
    await queryRunner.query(`ALTER TABLE "business_services" DROP COLUMN IF EXISTS "sort_order"`);
    await queryRunner.query(`ALTER TABLE "business_services" DROP COLUMN IF EXISTS "updated_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "business_services" ADD COLUMN "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "business_services" ADD COLUMN "sort_order" INTEGER DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "business_services" ALTER COLUMN "price" TYPE DECIMAL(15,2)`);
    await queryRunner.query(`ALTER TABLE "business_services" RENAME COLUMN "price" TO "price_from"`);
    await queryRunner.query(`ALTER TABLE "business_services" ALTER COLUMN "title" TYPE VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "business_services" RENAME COLUMN "title" TO "name"`);
  }
}
