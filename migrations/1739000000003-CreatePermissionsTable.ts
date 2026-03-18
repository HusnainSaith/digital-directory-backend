import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePermissionsTable1739000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists
    const tableExists = await queryRunner.hasTable('permissions');

    if (!tableExists) {
      // Create fresh table if it doesn't exist
      await queryRunner.createTable(
        new Table({
          name: 'permissions',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'name',
              type: 'varchar',
              length: '255',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'description',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'resource',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'action',
              type: 'varchar',
              length: '255',
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
    } else {
      // Table exists - add missing columns if they don't exist
      const table = await queryRunner.getTable('permissions');
      
      if (!table.findColumnByName('resource')) {
        await queryRunner.query(
          `ALTER TABLE "permissions" ADD COLUMN "resource" VARCHAR(255) NOT NULL DEFAULT ''`,
        );
      }
      
      if (!table.findColumnByName('action')) {
        await queryRunner.query(
          `ALTER TABLE "permissions" ADD COLUMN "action" VARCHAR(255) NOT NULL DEFAULT ''`,
        );
      }

      if (!table.findColumnByName('description')) {
        await queryRunner.query(
          `ALTER TABLE "permissions" ADD COLUMN "description" VARCHAR(500) NULL`,
        );
      }
    }

    // Create indexes if they don't exist
    const table = await queryRunner.getTable('permissions');
    const existingIndexes = table.indices.map((idx) => idx.name);

    if (!existingIndexes.includes('IDX_permissions_name')) {
      await queryRunner.createIndex(
        'permissions',
        new TableIndex({
          name: 'IDX_permissions_name',
          columnNames: ['name'],
        }),
      );
    }

    if (!existingIndexes.includes('IDX_permissions_resource_action')) {
      await queryRunner.createIndex(
        'permissions',
        new TableIndex({
          name: 'IDX_permissions_resource_action',
          columnNames: ['resource', 'action'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('permissions');
  }
}
