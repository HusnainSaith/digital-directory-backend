import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCountriesTable1741000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'countries',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '10',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'subdomain',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'flag_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'countries',
      new TableIndex({ name: 'IDX_countries_code', columnNames: ['code'] }),
    );

    await queryRunner.createIndex(
      'countries',
      new TableIndex({
        name: 'IDX_countries_subdomain',
        columnNames: ['subdomain'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('countries', 'IDX_countries_subdomain');
    await queryRunner.dropIndex('countries', 'IDX_countries_code');
    await queryRunner.dropTable('countries');
  }
}
