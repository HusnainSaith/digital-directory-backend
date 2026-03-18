import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateSubscriptionsTable1741000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'subscriptions',
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
            isNullable: false,
          },
          {
            name: 'plan_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'business_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'stripe_subscription_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'stripe_customer_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'active'",
          },
          {
            name: 'current_period_start',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'current_period_end',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'canceled_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'auto_renew',
            type: 'boolean',
            default: false,
            isNullable: false,
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
      'subscriptions',
      new TableForeignKey({
        name: 'FK_subscriptions_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'subscriptions',
      new TableForeignKey({
        name: 'FK_subscriptions_plan',
        columnNames: ['plan_id'],
        referencedTableName: 'subscription_plans',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'subscriptions',
      new TableForeignKey({
        name: 'FK_subscriptions_business',
        columnNames: ['business_id'],
        referencedTableName: 'enterprises',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex(
      'subscriptions',
      new TableIndex({ name: 'IDX_subscriptions_user', columnNames: ['user_id'] }),
    );

    await queryRunner.createIndex(
      'subscriptions',
      new TableIndex({ name: 'IDX_subscriptions_status', columnNames: ['status'] }),
    );

    await queryRunner.createIndex(
      'subscriptions',
      new TableIndex({ name: 'IDX_subscriptions_stripe_sub', columnNames: ['stripe_subscription_id'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('subscriptions', 'IDX_subscriptions_stripe_sub');
    await queryRunner.dropIndex('subscriptions', 'IDX_subscriptions_status');
    await queryRunner.dropIndex('subscriptions', 'IDX_subscriptions_user');
    await queryRunner.dropForeignKey('subscriptions', 'FK_subscriptions_business');
    await queryRunner.dropForeignKey('subscriptions', 'FK_subscriptions_plan');
    await queryRunner.dropForeignKey('subscriptions', 'FK_subscriptions_user');
    await queryRunner.dropTable('subscriptions');
  }
}
