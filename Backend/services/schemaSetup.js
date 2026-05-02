import db from '../config/knex.js';

async function ensureUsersStoreColumn() {
  try {
    const usersExists = await db.schema.hasTable('users');
    const storesExists = await db.schema.hasTable('stores');

    if (!usersExists || !storesExists) {
      return;
    }

    const hasStoreId = await db.schema.hasColumn('users', 'store_id');

    if (!hasStoreId) {
      await db.schema.alterTable('users', (table) => {
        table.integer('store_id').unsigned().nullable();
        table.index(['store_id'], 'idx_users_store_id');
        table
          .foreign('store_id', 'users_store_id_foreign')
          .references('id')
          .inTable('stores')
          .onDelete('SET NULL');
      });
      console.log(' Users.store_id column created');
    }
  } catch (error) {
    console.error('Error ensuring users.store_id column:', error);
  }
}

async function ensureOrderItemsBasePriceColumn() {
  try {
    const orderItemsExists = await db.schema.hasTable('order_items');

    if (!orderItemsExists) {
      return;
    }

    const hasBasePrice = await db.schema.hasColumn('order_items', 'base_price');

    if (!hasBasePrice) {
      await db.schema.alterTable('order_items', (table) => {
        table.decimal('base_price', 10, 2).nullable();
      });
      console.log(' Order_items.base_price column created');
    }

    await db('order_items')
      .whereNull('base_price')
      .update({
        base_price: db.ref('price'),
      });
  } catch (error) {
    console.error('Error ensuring order_items.base_price column:', error);
  }
}

export async function runStartupSchemaSetup() {
  try {
    await ensureUsersStoreColumn();
    await ensureOrderItemsBasePriceColumn();
  } catch (e) {
    console.warn('Schema setup skipped/failed:', e.message);
  }
}
