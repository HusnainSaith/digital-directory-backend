import 'reflect-metadata';
import { AppDataSource } from './src/config/data-source';

async function checkSchema() {
  await AppDataSource.initialize();
  try {
    // Check notification_log column types
    const cols = await AppDataSource.query(
      `SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='notifications_log' ORDER BY ordinal_position`
    );
    cols.forEach((c: any) => console.log(`${c.column_name}: ${c.data_type} (${c.udt_name})`));

    // Check subscription_plans column types  
    console.log('---');
    const planCols = await AppDataSource.query(
      `SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='subscription_plans' ORDER BY ordinal_position`
    );
    planCols.forEach((c: any) => console.log(`${c.column_name}: ${c.data_type} (${c.udt_name})`));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await AppDataSource.destroy();
  }
}

checkSchema();
