import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreatePaymentsTable1741000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'subscription_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'stripe_payment_intent_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'stripe_invoice_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
            default: "'usd'",
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
          },
          {
            name: 'payment_method',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
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
      'payments',
      new TableForeignKey({
        name: 'FK_payments_subscription',
        columnNames: ['subscription_id'],
        referencedTableName: 'subscriptions',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        name: 'FK_payments_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({ name: 'IDX_payments_user', columnNames: ['user_id'] }),
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({ name: 'IDX_payments_status', columnNames: ['status'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('payments', 'IDX_payments_status');
    await queryRunner.dropIndex('payments', 'IDX_payments_user');
    await queryRunner.dropForeignKey('payments', 'FK_payments_user');
    await queryRunner.dropForeignKey('payments', 'FK_payments_subscription');
    await queryRunner.dropTable('payments');
  }
}
