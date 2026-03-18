import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeCategoryIconToText1742200000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "icon" TYPE text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "icon" TYPE character varying(500)`);
  }
}
