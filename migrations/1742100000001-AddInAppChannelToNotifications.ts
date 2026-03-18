import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInAppChannelToNotifications1742100000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL allows adding new values to existing ENUMs without recreation
    await queryRunner.query(
      `ALTER TYPE "notification_channel_enum" ADD VALUE IF NOT EXISTS 'in_app'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Removing enum values in PostgreSQL requires recreating the type.
    // Intentionally left empty — rollback requires manual intervention.
  }
}
