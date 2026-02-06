
import db from './config/knex.js';

async function checkOrderSchema() {
  try {
    const hasTable = await db.schema.hasTable('orders');
    if (hasTable) {
      const columnInfo = await db('orders').columnInfo();
      console.log('Orders table columns:', Object.keys(columnInfo));
    } else {
      console.log('Orders table does not exist');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkOrderSchema();
