import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateReviewsTable1740000000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'reviews',
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
            name: 'author_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'rating',
            type: 'smallint',
            isNullable: false,
            comment: 'Rating from 1 to 5',
          },
          {
            name: 'comment',
            type: 'text',
            isNullable: true,
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
      'reviews',
      new TableForeignKey({
        name: 'FK_reviews_enterprise',
        columnNames: ['enterprise_id'],
        referencedTableName: 'enterprises',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'reviews',
      new TableIndex({
        name: 'IDX_reviews_enterprise_id',
        columnNames: ['enterprise_id'],
      }),
    );

    await queryRunner.createIndex(
      'reviews',
      new TableIndex({
        name: 'IDX_reviews_rating',
        columnNames: ['rating'],
      }),
    );

    await queryRunner.createIndex(
      'reviews',
      new TableIndex({
        name: 'IDX_reviews_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Add check constraint for rating range
    await queryRunner.query(
      `ALTER TABLE reviews ADD CONSTRAINT CHK_reviews_rating CHECK (rating >= 1 AND rating <= 5)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('reviews');
  }
}
