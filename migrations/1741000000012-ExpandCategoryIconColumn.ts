import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ExpandCategoryIconColumn1741000000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Expand icon column from varchar(100) to varchar(500)
    // to accommodate R2 storage URLs which can be longer than 100 chars
    await queryRunner.changeColumn(
      'categories',
      'icon',
      new TableColumn({
        name: 'icon',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'categories',
      'icon',
      new TableColumn({
        name: 'icon',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    );
  }
}
