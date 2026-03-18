import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddNewColumnsToUsers1741000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'phone',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
      new TableColumn({
        name: 'avatar_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
      }),
      new TableColumn({
        name: 'is_verified',
        type: 'boolean',
        default: false,
      }),
      new TableColumn({
        name: 'email_verified_at',
        type: 'timestamp',
        isNullable: true,
      }),
      new TableColumn({
        name: 'verification_token',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
      new TableColumn({
        name: 'verification_token_expires',
        type: 'timestamp',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'verification_token_expires');
    await queryRunner.dropColumn('users', 'verification_token');
    await queryRunner.dropColumn('users', 'email_verified_at');
    await queryRunner.dropColumn('users', 'is_verified');
    await queryRunner.dropColumn('users', 'is_active');
    await queryRunner.dropColumn('users', 'avatar_url');
    await queryRunner.dropColumn('users', 'phone');
  }
}
