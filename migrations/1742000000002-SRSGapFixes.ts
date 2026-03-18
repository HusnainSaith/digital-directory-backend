import { MigrationInterface, QueryRunner } from 'typeorm';

export class SRSGapFixes1742000000002 implements MigrationInterface {
  name = 'SRSGapFixes1742000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const renamed = await queryRunner.hasTable('business_branches');
    const branchesTable = renamed ? 'business_branches' : 'enterprise_branches';
    const mediaTable = renamed ? 'business_media' : 'business_media'; // business_media created directly
    const servicesTable = renamed ? 'business_services' : 'enterprise_services';

    // #5: Add city_id, phone, operating_hours to branches
    await queryRunner.query(
      `ALTER TABLE "${branchesTable}" ADD COLUMN IF NOT EXISTS "city_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "${branchesTable}" ADD COLUMN IF NOT EXISTS "phone" varchar(30)`,
    );
    await queryRunner.query(
      `ALTER TABLE "${branchesTable}" ADD COLUMN IF NOT EXISTS "operating_hours" text`,
    );
    const fkName = renamed ? 'FK_business_branches_city' : 'FK_enterprise_branches_city';
    await queryRunner.query(
      `ALTER TABLE "${branchesTable}" ADD CONSTRAINT "${fkName}" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // #6: Add invoice_url to payments
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "invoice_url" text`,
    );

    // #8: Add is_active to cities
    await queryRunner.query(
      `ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true`,
    );

    // #9: Add sort_order to business_media
    await queryRunner.query(
      `ALTER TABLE "${mediaTable}" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0`,
    );

    // #10: Add image_url to services
    await queryRunner.query(
      `ALTER TABLE "${servicesTable}" ADD COLUMN IF NOT EXISTS "image_url" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const renamed = await queryRunner.hasTable('business_branches');
    const branchesTable = renamed ? 'business_branches' : 'enterprise_branches';
    const mediaTable = 'business_media';
    const servicesTable = renamed ? 'business_services' : 'enterprise_services';
    const fkName = renamed ? 'FK_business_branches_city' : 'FK_enterprise_branches_city';

    await queryRunner.query(`ALTER TABLE "${servicesTable}" DROP COLUMN IF EXISTS "image_url"`);
    await queryRunner.query(`ALTER TABLE "${mediaTable}" DROP COLUMN IF EXISTS "sort_order"`);
    await queryRunner.query(`ALTER TABLE "cities" DROP COLUMN IF EXISTS "is_active"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "invoice_url"`);
    await queryRunner.query(`ALTER TABLE "${branchesTable}" DROP CONSTRAINT IF EXISTS "${fkName}"`);
    await queryRunner.query(`ALTER TABLE "${branchesTable}" DROP COLUMN IF EXISTS "operating_hours"`);
    await queryRunner.query(`ALTER TABLE "${branchesTable}" DROP COLUMN IF EXISTS "phone"`);
    await queryRunner.query(`ALTER TABLE "${branchesTable}" DROP COLUMN IF EXISTS "city_id"`);
  }
}
