import db from '../config/knex.js';

export async function ensureAuthColumns() {
  // Add missing columns to users table for phone verification and password reset
  const hasUsers = await db.schema.hasTable('users');
  if (!hasUsers) return; // assume created elsewhere

  const addIfMissing = async (column, builder) => {
    const exists = await db.schema.hasColumn('users', column);
    if (!exists) {
      await db.schema.alterTable('users', (t) => builder(t));
      console.log(`Added users.${column}`);
    }
  };

  await addIfMissing('phone_verified', (t) => t.boolean('phone_verified').defaultTo(false));
  await addIfMissing('phone_verification_code', (t) => t.string('phone_verification_code', 20).nullable());
  await addIfMissing('phone_verification_expires', (t) => t.dateTime('phone_verification_expires').nullable());
  await addIfMissing('password_reset_code', (t) => t.string('password_reset_code', 20).nullable());
  await addIfMissing('password_reset_expires', (t) => t.dateTime('password_reset_expires').nullable());
}

export async function ensureUsersTable() {
  const hasUsers = await db.schema.hasTable('users');
  if (hasUsers) return;

  await db.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('username', 50).notNullable();
    t.string('email', 255).notNullable();
    t.string('password', 255).notNullable();
    t.string('first_name', 100).nullable();
    t.string('last_name', 100).nullable();
    t.string('phone', 32).nullable();
    t.string('status', 20).notNullable().defaultTo('inactive');
    // Auth extension fields
    t.boolean('phone_verified').notNullable().defaultTo(false);
    t.string('phone_verification_code', 20).nullable();
    t.dateTime('phone_verification_expires').nullable();
    t.string('password_reset_code', 20).nullable();
    t.dateTime('password_reset_expires').nullable();
    t.timestamps(true, true);
    t.unique(['username']);
    t.unique(['email']);
  });
  console.log('Created table users');
}

export async function ensureWalletTables() {
  // Create wallets and wallet_transactions tables if missing; patch missing columns if table pre-exists
  const hasWallets = await db.schema.hasTable('wallets');
  if (!hasWallets) {
    await db.schema.createTable('wallets', (t) => {
      t.increments('id').primary();
      t.integer('user_id').unsigned().notNullable().index();
      t.decimal('balance', 18, 2).notNullable().defaultTo(0);
      t.string('currency', 8).notNullable().defaultTo('USD');
      t.timestamps(true, true);
    });
    console.log('Created table wallets');
  } else {
    // Patch missing columns for legacy schema versions
    const ensureColumn = async (col, builder) => {
      const exists = await db.schema.hasColumn('wallets', col);
      if (!exists) {
        await db.schema.alterTable('wallets', (t) => builder(t));
        console.log(`Added wallets.${col}`);
      }
    };
    await ensureColumn('currency', (t) => t.string('currency', 8).notNullable().defaultTo('USD'));
    // Optionally ensure timestamps (skip if already present)
    const hasCreatedAt = await db.schema.hasColumn('wallets', 'created_at');
    const hasUpdatedAt = await db.schema.hasColumn('wallets', 'updated_at');
    if (!hasCreatedAt || !hasUpdatedAt) {
      await db.schema.alterTable('wallets', (t) => {
        if (!hasCreatedAt) t.timestamp('created_at').defaultTo(db.fn.now());
        if (!hasUpdatedAt) t.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Patched wallets timestamps');
    }
  }

  const hasWalletTx = await db.schema.hasTable('wallet_transactions');
  if (!hasWalletTx) {
    await db.schema.createTable('wallet_transactions', (t) => {
      t.increments('id').primary();
      t.integer('wallet_id').unsigned().notNullable().index();
      t.string('type', 10).notNullable(); // 'credit' | 'debit'
      t.decimal('amount', 18, 2).notNullable();
      t.string('reference', 255).nullable();
      t.text('metadata').nullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('Created table wallet_transactions');
  }
}

export async function ensureNotificationsTable() {
  const exists = await db.schema.hasTable('notifications');
  if (!exists) {
    await db.schema.createTable('notifications', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('type', 50).notNullable();
      table.string('title', 255).notNullable();
      table.text('message').notNullable();
      table.text('metadata');
      table.boolean('is_read').defaultTo(false);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
      
      table.index('user_id');
      table.index('is_read');
      table.index(['user_id', 'is_read']);
      table.index('created_at');
    });
    console.log('✅ notifications table created');
  }
}

export async function ensureProductsColumns() {
  const hasProducts = await db.schema.hasTable('products');
  if (!hasProducts) return;

  // Add brand column if missing
  const hasBrand = await db.schema.hasColumn('products', 'brand');
  if (!hasBrand) {
    await db.schema.alterTable('products', (t) => {
      t.string('brand', 100).nullable();
    });
    console.log('Added products.brand column');
  }
}

export async function ensureProductReviewsTable() {
  const has = await db.schema.hasTable('product_reviews');
  if (has) return;
  await db.schema.createTable('product_reviews', (t) => {
    t.increments('id').primary();
    t.integer('product_id').unsigned().notNullable().index();
    t.integer('user_id').unsigned().nullable().index();
    t.integer('rating').notNullable(); // 1-5
    t.text('comment').nullable();
    t.timestamp('created_at').defaultTo(db.fn.now());
  });
  console.log('Created table product_reviews');
}

export async function runStartupSchemaSetup() {
  try {
    await ensureUsersTable();
    await ensureAuthColumns();
    await ensureWalletTables();
    await ensureNotificationsTable();
    await ensureProductsColumns();
    await ensureProductReviewsTable();
  } catch (e) {
    console.warn('Schema setup skipped/failed:', e.message);
  }
}
