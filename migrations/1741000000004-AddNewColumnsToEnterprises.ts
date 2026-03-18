import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddNewColumnsToEnterprises1741000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('enterprises', [
      new TableColumn({
        name: 'is_approved',
        type: 'boolean',
        default: false,
      }),
      new TableColumn({
        name: 'approved_at',
        type: 'timestamp',
        isNullable: true,
      }),
      new TableColumn({
        name: 'rejection_reason',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'owner_id',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'country_id',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'city_id',
        type: 'uuid',
        isNullable: true,
      }),
    ]);

    await queryRunner.createForeignKey(
      'enterprises',
      new TableForeignKey({
        name: 'FK_enterprises_owner',
        columnNames: ['owner_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'enterprises',
      new TableForeignKey({
        name: 'FK_enterprises_country',
        columnNames: ['country_id'],
        referencedTableName: 'countries',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'enterprises',
      new TableForeignKey({
        name: 'FK_enterprises_city',
        columnNames: ['city_id'],
        referencedTableName: 'cities',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('enterprises', 'FK_enterprises_city');
    await queryRunner.dropForeignKey('enterprises', 'FK_enterprises_country');
    await queryRunner.dropForeignKey('enterprises', 'FK_enterprises_owner');
    await queryRunner.dropColumn('enterprises', 'city_id');
    await queryRunner.dropColumn('enterprises', 'country_id');
    await queryRunner.dropColumn('enterprises', 'owner_id');
    await queryRunner.dropColumn('enterprises', 'rejection_reason');
    await queryRunner.dropColumn('enterprises', 'approved_at');
    await queryRunner.dropColumn('enterprises', 'is_approved');
  }
}
