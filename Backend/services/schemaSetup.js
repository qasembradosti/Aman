import db from '../config/knex.js';


export async function ensureProductVideosTable() {
  const exists = await db.schema.hasTable('product_videos');
  if (exists) return;

  await db.schema.createTable('product_videos', (table) => {
    table.increments('id').primary();
    table.integer('product_id').unsigned().notNullable().index();
    table.string('video_url', 500).notNullable();
    table.boolean('is_main').defaultTo(false);
    table.timestamp('created_at').defaultTo(db.fn.now());
    
    table.index(['product_id', 'is_main']);
  });
  console.log('✅ product_videos table created');
}

export async function runStartupSchemaSetup() {
  try {
    await ensureProductVideosTable();
  } catch (e) {
    console.warn('Schema setup skipped/failed:', e.message);
  }
}
