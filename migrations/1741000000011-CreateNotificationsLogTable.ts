import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateNotificationsLogTable1741000000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notifications_log',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '20',
            default: "'email'",
          },
          {
            name: 'channel',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'recipient',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'subject',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'template_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'retry_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'sent_at',
            type: 'timestamp',
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
      'notifications_log',
      new TableForeignKey({
        name: 'FK_notifications_log_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex(
      'notifications_log',
      new TableIndex({ name: 'IDX_notifications_log_user', columnNames: ['user_id'] }),
    );

    await queryRunner.createIndex(
      'notifications_log',
      new TableIndex({ name: 'IDX_notifications_log_status', columnNames: ['status'] }),
    );

    await queryRunner.createIndex(
      'notifications_log',
      new TableIndex({ name: 'IDX_notifications_log_type', columnNames: ['type'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('notifications_log', 'IDX_notifications_log_type');
    await queryRunner.dropIndex('notifications_log', 'IDX_notifications_log_status');
    await queryRunner.dropIndex('notifications_log', 'IDX_notifications_log_user');
    await queryRunner.dropForeignKey('notifications_log', 'FK_notifications_log_user');
    await queryRunner.dropTable('notifications_log');
  }
}
