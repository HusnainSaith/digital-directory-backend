import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRejectionReasonToBusinesses1741000000017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableName = (await queryRunner.hasTable('businesses'))
      ? 'businesses'
      : 'enterprises';
    const hasColumn = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = '${tableName}' AND column_name = 'rejection_reason'
    `);
    if (hasColumn.length === 0) {
      await queryRunner.query(`ALTER TABLE ${tableName} ADD COLUMN rejection_reason TEXT`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableName = (await queryRunner.hasTable('businesses'))
      ? 'businesses'
      : 'enterprises';
    await queryRunner.query(`ALTER TABLE ${tableName} DROP COLUMN IF EXISTS rejection_reason`);
  }
}
