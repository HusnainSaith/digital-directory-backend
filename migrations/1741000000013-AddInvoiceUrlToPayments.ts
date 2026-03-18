import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddInvoiceUrlToPayments1741000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('payments', 'invoice_url');
    if (!hasColumn) {
      await queryRunner.addColumn(
        'payments',
        new TableColumn({
          name: 'invoice_url',
          type: 'text',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('payments', 'invoice_url');
    if (hasColumn) {
      await queryRunner.dropColumn('payments', 'invoice_url');
    }
  }
}
