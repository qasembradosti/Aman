
import db from './config/knex.js';

async function checkOrderItemsSchema() {
  try {
    const hasTable = await db.schema.hasTable('order_items');
    if (hasTable) {
      const columnInfo = await db('order_items').columnInfo();
      console.log('Order Items table columns:', Object.keys(columnInfo));
      
      // Also check one item to see values
      const item = await db('order_items').first();
      console.log('Sample order item:', item);
    } else {
      console.log('Order Items table does not exist');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkOrderItemsSchema();
