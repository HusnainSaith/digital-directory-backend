import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRetryColumnsToNotificationsLog1741000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = 'notifications_log';

    const columnsToAdd = [
      { name: 'recipient_email', type: 'varchar', length: '255', isNullable: true },
      { name: 'subject', type: 'varchar', length: '500', isNullable: true },
      { name: 'template_name', type: 'varchar', length: '100', isNullable: true },
      { name: 'context_data', type: 'jsonb', isNullable: true },
    ];

    for (const col of columnsToAdd) {
      const hasColumn = await queryRunner.hasColumn(table, col.name);
      if (!hasColumn) {
        await queryRunner.addColumn(
          table,
          new TableColumn(col),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = 'notifications_log';
    const columns = ['recipient_email', 'subject', 'template_name', 'context_data'];

    for (const col of columns) {
      const hasColumn = await queryRunner.hasColumn(table, col);
      if (hasColumn) {
        await queryRunner.dropColumn(table, col);
      }
    }
  }
}
