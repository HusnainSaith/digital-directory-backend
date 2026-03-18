import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateEnterpriseBusinessHoursTable1740000000005
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for days of the week
    await queryRunner.query(`
      CREATE TYPE day_of_week_type AS ENUM (
        'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
      )
    `);

    await queryRunner.createTable(
      new Table({
        name: 'enterprise_business_hours',
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
            name: 'day_of_week',
            type: 'day_of_week_type',
            isNullable: false,
          },
          {
            name: 'open_time',
            type: 'varchar',
            length: '5',
            isNullable: false,
            comment: 'Format: HH:MM (e.g., 09:00)',
          },
          {
            name: 'close_time',
            type: 'varchar',
            length: '5',
            isNullable: false,
            comment: 'Format: HH:MM (e.g., 18:00)',
          },
          {
            name: 'is_closed',
            type: 'boolean',
            default: false,
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
      'enterprise_business_hours',
      new TableForeignKey({
        name: 'FK_enterprise_business_hours_enterprise',
        columnNames: ['enterprise_id'],
        referencedTableName: 'enterprises',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'enterprise_business_hours',
      new TableIndex({
        name: 'IDX_enterprise_business_hours_enterprise_id',
        columnNames: ['enterprise_id'],
      }),
    );

    // Unique constraint: one entry per enterprise per day
    await queryRunner.createIndex(
      'enterprise_business_hours',
      new TableIndex({
        name: 'UQ_enterprise_business_hours_enterprise_day',
        columnNames: ['enterprise_id', 'day_of_week'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('enterprise_business_hours');
    await queryRunner.query('DROP TYPE IF EXISTS day_of_week_type');
  }
}
