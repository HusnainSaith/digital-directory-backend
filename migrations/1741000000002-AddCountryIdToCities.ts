import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddCountryIdToCities1741000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'cities',
      new TableColumn({
        name: 'country_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'cities',
      new TableForeignKey({
        name: 'FK_cities_country',
        columnNames: ['country_id'],
        referencedTableName: 'countries',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('cities', 'FK_cities_country');
    await queryRunner.dropColumn('cities', 'country_id');
  }
}
