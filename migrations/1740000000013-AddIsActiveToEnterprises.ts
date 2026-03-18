import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsActiveToEnterprises1740000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'enterprises',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('enterprises', 'is_active');
  }
}
