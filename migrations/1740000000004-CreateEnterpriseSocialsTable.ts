import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateEnterpriseSocialsTable1740000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for social platforms
    await queryRunner.query(`
      CREATE TYPE social_platform_type AS ENUM (
        'facebook', 'instagram', 'linkedin', 'youtube', 'x', 'kakao'
      )
    `);

    await queryRunner.createTable(
      new Table({
        name: 'enterprise_socials',
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
            name: 'type',
            type: 'social_platform_type',
            isNullable: false,
          },
          {
            name: 'url',
            type: 'varchar',
            length: '500',
            isNullable: false,
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
      'enterprise_socials',
      new TableForeignKey({
        name: 'FK_enterprise_socials_enterprise',
        columnNames: ['enterprise_id'],
        referencedTableName: 'enterprises',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'enterprise_socials',
      new TableIndex({
        name: 'IDX_enterprise_socials_enterprise_id',
        columnNames: ['enterprise_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('enterprise_socials');
    await queryRunner.query('DROP TYPE IF EXISTS social_platform_type');
  }
}
