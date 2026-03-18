import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateBusinessCardsTable1741000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'business_cards',
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
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'card_image_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'card_pdf_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'card_data',
            type: 'jsonb',
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
      'business_cards',
      new TableForeignKey({
        name: 'FK_business_cards_enterprise',
        columnNames: ['business_id'],
        referencedTableName: 'enterprises',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('business_cards', 'FK_business_cards_enterprise');
    await queryRunner.dropTable('business_cards');
  }
}
