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

export async function runStartupSchemaSetup() {
  try {
    await ensureUsersStoreColumn();
  } catch (e) {
    console.warn('Schema setup skipped/failed:', e.message);
  }
}
