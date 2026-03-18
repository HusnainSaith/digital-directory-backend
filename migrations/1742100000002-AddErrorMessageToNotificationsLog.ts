import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddErrorMessageToNotificationsLog1742100000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications_log" ADD COLUMN IF NOT EXISTS "error_message" TEXT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications_log" DROP COLUMN IF EXISTS "error_message"`,
    );
  }
}
