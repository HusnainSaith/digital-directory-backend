import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateEnterpriseCategoriesTable1740000000010
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'enterprise_categories',
        columns: [
          {
            name: 'enterprise_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'category_id',
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
      'enterprise_categories',
      new TableForeignKey({
        name: 'FK_enterprise_categories_enterprise',
        columnNames: ['enterprise_id'],
        referencedTableName: 'enterprises',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'enterprise_categories',
      new TableForeignKey({
        name: 'FK_enterprise_categories_category',
        columnNames: ['category_id'],
        referencedTableName: 'categories',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'enterprise_categories',
      new TableIndex({
        name: 'IDX_enterprise_categories_enterprise_id',
        columnNames: ['enterprise_id'],
      }),
    );

    await queryRunner.createIndex(
      'enterprise_categories',
      new TableIndex({
        name: 'IDX_enterprise_categories_category_id',
        columnNames: ['category_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('enterprise_categories');
  }
}
