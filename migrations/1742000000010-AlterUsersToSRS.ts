import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterUsersToSRS1742000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename full_name -> name, change to VARCHAR(150)
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "full_name" TO "name"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "name" TYPE VARCHAR(150)`);

    // Rename password -> password_hash, change to TEXT
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "password" TO "password_hash"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_hash" TYPE TEXT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "password_hash" TO "password"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" TYPE VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "name" TO "full_name"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "full_name" TYPE VARCHAR(255)`);
  }
}
