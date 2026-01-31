import db from '../config/knex.js';

export async function ensureFavoritesTable() {
  const exists = await db.schema.hasTable('favorites');
  if (exists) return; // Table already exists

  try {
    await db.schema.createTable('favorites', (table) => {
      table.increments('id').primary();
      table.integer('user_id').notNullable().unsigned();
      table.integer('product_id').notNullable().unsigned();
      table.timestamp('created_at').defaultTo(db.fn.now());
      
      // Foreign keys
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('product_id').references('id').inTable('products').onDelete('CASCADE');
      
      // Unique constraint to prevent duplicate favorites
      table.unique(['user_id', 'product_id']);
      
      // Indexes for better performance
      table.index('user_id');
      table.index('product_id');
    });
    console.log('✅ Favorites table created');
  } catch (error) {
    console.error('Error creating favorites table:', error);
  }
}


export async function runStartupSchemaSetup() {
  try {
    await ensureFavoritesTable();
  } catch (e) {
    console.warn('Schema setup skipped/failed:', e.message);
  }
}
