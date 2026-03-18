import 'reflect-metadata';
import { AppDataSource } from '../src/config/data-source';

async function fixSchema() {
  await AppDataSource.initialize();
  try {
    // Drop unique constraint on permissions.slug
    await AppDataSource.query(
      `ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "UQ_d090ad82a0e97ce764c06c7b312"`,
    );
    console.log('Dropped permissions slug unique constraint');

    // Drop unique constraint on roles.slug
    await AppDataSource.query(
      `ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "UQ_881f72bac969d9a00a1a29e1079"`,
    );
    console.log('Dropped roles slug unique constraint');

    // Check for any other slug unique constraints on roles
    const roleConstraints = await AppDataSource.query(
      `SELECT conname FROM pg_constraint WHERE conrelid = 'roles'::regclass AND contype = 'u'`,
    );
    for (const c of roleConstraints) {
      // Check if it's on slug column
      const cols = await AppDataSource.query(
        `SELECT a.attname FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) WHERE c.conname = '${c.conname}'`,
      );
      const colNames = cols.map((col: any) => col.attname);
      if (colNames.includes('slug')) {
        await AppDataSource.query(
          `ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "${c.conname}"`,
        );
        console.log(`Dropped roles constraint: ${c.conname}`);
      }
    }

    // Fix legacy NOT NULL columns on users table that entity doesn't define
    await AppDataSource.query(
      `ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL`,
    );
    await AppDataSource.query(
      `ALTER TABLE "users" ALTER COLUMN "username" SET DEFAULT ''`,
    );
    await AppDataSource.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP NOT NULL`,
    );
    await AppDataSource.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'`,
    );
    console.log('Fixed users table legacy column constraints');

    // Clean up any partial seed data
    await AppDataSource.query(
      `DELETE FROM "permissions" WHERE "name" = 'users.create'`,
    );
    console.log('Cleaned up partial seed data');

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await AppDataSource.destroy();
  }
}

fixSchema();
