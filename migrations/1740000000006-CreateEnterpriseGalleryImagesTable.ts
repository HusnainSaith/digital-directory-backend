import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateEnterpriseGalleryImagesTable1740000000006
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'enterprise_gallery_images',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'enterprise_id',
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
            length: '500',
            isNullable: true,
          },
          {
            name: 'sort_order',
            type: 'integer',
            default: 0,
            comment: 'Display order of images in the gallery',
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
      'enterprise_gallery_images',
      new TableForeignKey({
        name: 'FK_enterprise_gallery_images_enterprise',
        columnNames: ['enterprise_id'],
        referencedTableName: 'enterprises',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'enterprise_gallery_images',
      new TableIndex({
        name: 'IDX_enterprise_gallery_images_enterprise_id',
        columnNames: ['enterprise_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('enterprise_gallery_images');
  }
}
