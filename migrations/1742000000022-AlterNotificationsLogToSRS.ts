import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterNotificationsLogToSRS1742000000022 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM types
    await queryRunner.query(`CREATE TYPE "notification_channel_enum" AS ENUM('email')`);
    await queryRunner.query(`CREATE TYPE "notification_status_enum" AS ENUM('sent', 'failed', 'pending')`);

    // Change channel to ENUM
    await queryRunner.query(`UPDATE "notifications_log" SET "channel" = 'email' WHERE "channel" IS NULL OR "channel" NOT IN ('email')`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ALTER COLUMN "channel" TYPE "notification_channel_enum" USING "channel"::"notification_channel_enum"`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ALTER COLUMN "channel" SET NOT NULL`);

    // Change status to ENUM
    await queryRunner.query(`UPDATE "notifications_log" SET "status" = 'pending' WHERE "status" NOT IN ('sent', 'failed', 'pending')`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ALTER COLUMN "status" TYPE "notification_status_enum" USING "status"::"notification_status_enum"`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ALTER COLUMN "status" SET NOT NULL`);

    // Make user_id NOT NULL
    await queryRunner.query(`DELETE FROM "notifications_log" WHERE "user_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ALTER COLUMN "user_id" SET NOT NULL`);

    // Change type to VARCHAR(50)
    await queryRunner.query(`ALTER TABLE "notifications_log" ALTER COLUMN "type" TYPE VARCHAR(50)`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ALTER COLUMN "type" SET NOT NULL`);

    // Drop columns not in SRS
    await queryRunner.query(`ALTER TABLE "notifications_log" DROP COLUMN IF EXISTS "recipient"`);
    await queryRunner.query(`ALTER TABLE "notifications_log" DROP COLUMN IF EXISTS "subject"`);
    await queryRunner.query(`ALTER TABLE "notifications_log" DROP COLUMN IF EXISTS "content"`);
    await queryRunner.query(`ALTER TABLE "notifications_log" DROP COLUMN IF EXISTS "template_name"`);
    await queryRunner.query(`ALTER TABLE "notifications_log" DROP COLUMN IF EXISTS "error_message"`);
    await queryRunner.query(`ALTER TABLE "notifications_log" DROP COLUMN IF EXISTS "retry_count"`);
    await queryRunner.query(`ALTER TABLE "notifications_log" DROP COLUMN IF EXISTS "updated_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notifications_log" ADD COLUMN "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ADD COLUMN "retry_count" INTEGER DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ADD COLUMN "error_message" TEXT`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ADD COLUMN "template_name" VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ADD COLUMN "content" TEXT`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ADD COLUMN "subject" VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ADD COLUMN "recipient" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ALTER COLUMN "user_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ALTER COLUMN "type" TYPE VARCHAR(20)`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ALTER COLUMN "status" TYPE VARCHAR(20) USING "status"::TEXT`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ALTER COLUMN "status" SET DEFAULT 'pending'`);
    await queryRunner.query(`ALTER TABLE "notifications_log" ALTER COLUMN "channel" TYPE VARCHAR(50) USING "channel"::TEXT`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_channel_enum"`);
  }
}
