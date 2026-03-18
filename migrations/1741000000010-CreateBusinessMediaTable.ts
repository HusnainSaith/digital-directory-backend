import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateBusinessMediaTable1741000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'business_media',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'business_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'url',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'alt',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'media_type',
            type: 'varchar',
            length: '20',
            default: "'image'",
          },
          {
            name: 'file_size',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'r2_key',
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

    await queryRunner.createForeignKey(
      'business_media',
      new TableForeignKey({
        name: 'FK_business_media_enterprise',
        columnNames: ['business_id'],
        referencedTableName: 'enterprises',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'business_media',
      new TableIndex({ name: 'IDX_business_media_business', columnNames: ['business_id'] }),
    );

    await queryRunner.createIndex(
      'business_media',
      new TableIndex({ name: 'IDX_business_media_type', columnNames: ['media_type'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('business_media', 'IDX_business_media_type');
    await queryRunner.dropIndex('business_media', 'IDX_business_media_business');
    await queryRunner.dropForeignKey('business_media', 'FK_business_media_enterprise');
    await queryRunner.dropTable('business_media');
  }
}
