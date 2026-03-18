import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateNotificationLogsTable1742100000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notifications_log" ADD COLUMN IF NOT EXISTS "recipient" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ADD COLUMN IF NOT EXISTS "subject" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ADD COLUMN IF NOT EXISTS "template_name" VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ADD COLUMN IF NOT EXISTS "content" TEXT`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ADD COLUMN IF NOT EXISTS "retry_count" INTEGER DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ALTER COLUMN "user_id" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notifications_log" DROP COLUMN IF EXISTS "retry_count"`);
    await queryRunner.query(`ALTER TABLE "notifications_log" DROP COLUMN IF EXISTS "content"`);
    await queryRunner.query(`ALTER TABLE "notifications_log" DROP COLUMN IF EXISTS "template_name"`);
    await queryRunner.query(`ALTER TABLE "notifications_log" DROP COLUMN IF EXISTS "subject"`);
    await queryRunner.query(`ALTER TABLE "notifications_log" DROP COLUMN IF EXISTS "recipient"`);
  }
}
