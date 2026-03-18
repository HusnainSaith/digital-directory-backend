import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateEnterpriseRelatedTable1740000000011
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'enterprise_related',
        columns: [
          {
            name: 'enterprise_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'related_enterprise_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'enterprise_related',
      new TableForeignKey({
        name: 'FK_enterprise_related_enterprise',
        columnNames: ['enterprise_id'],
        referencedTableName: 'enterprises',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'enterprise_related',
      new TableForeignKey({
        name: 'FK_enterprise_related_related_enterprise',
        columnNames: ['related_enterprise_id'],
        referencedTableName: 'enterprises',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'enterprise_related',
      new TableIndex({
        name: 'IDX_enterprise_related_enterprise_id',
        columnNames: ['enterprise_id'],
      }),
    );

    await queryRunner.createIndex(
      'enterprise_related',
      new TableIndex({
        name: 'IDX_enterprise_related_related_enterprise_id',
        columnNames: ['related_enterprise_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('enterprise_related');
  }
}
