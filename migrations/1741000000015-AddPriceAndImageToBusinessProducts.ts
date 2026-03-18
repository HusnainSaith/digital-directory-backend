import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPriceAndImageToBusinessProducts1741000000015
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableName = (await queryRunner.hasTable('business_products'))
      ? 'business_products'
      : 'enterprise_products';

    const hasPrice = await queryRunner.hasColumn(tableName, 'price');
    if (!hasPrice) {
      await queryRunner.addColumn(tableName, new TableColumn({
        name: 'price',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
      }));
    }

    const hasImageUrl = await queryRunner.hasColumn(tableName, 'image_url');
    if (!hasImageUrl) {
      await queryRunner.addColumn(tableName, new TableColumn({
        name: 'image_url',
        type: 'text',
        isNullable: true,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableName = (await queryRunner.hasTable('business_products'))
      ? 'business_products'
      : 'enterprise_products';
    await queryRunner.dropColumn(tableName, 'image_url');
    await queryRunner.dropColumn(tableName, 'price');
  }
}
