import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCategoryIsActiveAndPlanDuration1742000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add is_active to categories
    await queryRunner.addColumn(
      'categories',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
      }),
    );

    // Add duration_in_days to subscription_plans
    await queryRunner.addColumn(
      'subscription_plans',
      new TableColumn({
        name: 'duration_in_days',
        type: 'int',
        default: 30,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('subscription_plans', 'duration_in_days');
    await queryRunner.dropColumn('categories', 'is_active');
  }
}
