import db from '../config/knex.js';

export async function ensureChatTables() {
  try {
    // Drop existing tables if they exist with wrong structure
    const conversationsExists = await db.schema.hasTable('conversations');
    const messagesExists = await db.schema.hasTable('chat_messages');

    if (!messagesExists) {
      // Create conversations table - match user_id and order_id types exactly
      await db.schema.createTable('conversations', (table) => {
        table.increments('id').primary();
        table.integer('user_id').notNullable(); // Match users.id type (int, signed)
        table.integer('order_id').nullable(); // Match orders.id type (int, signed)
        table.string('subject', 255).defaultTo('General Support');
        table.enum('status', ['open', 'closed', 'pending']).defaultTo('open');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());

        // Foreign keys
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.foreign('order_id').references('id').inTable('orders').onDelete('SET NULL');

        // Indexes
        table.index('user_id');
        table.index('order_id');
        table.index('status');
        table.index('updated_at');
        table.index(['user_id', 'order_id']);
      });
      console.log(' Conversations table created');
    }


    if (!conversationsExists) {

      // Create chat_messages table
      await db.schema.createTable('chat_messages', (table) => {
        table.increments('id').primary();
        table.integer('conversation_id').notNullable().unsigned(); // references conversations.id (unsigned from increments)
        table.integer('sender_id').notNullable(); // Match users.id type (int, signed)
        table.enum('sender_type', ['user', 'support', 'admin']).defaultTo('user');
        table.text('message').notNullable();
        table.boolean('is_read').defaultTo(false);
        table.timestamp('read_at').nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());

        // Foreign keys
        table.foreign('conversation_id').references('id').inTable('conversations').onDelete('CASCADE');
        table.foreign('sender_id').references('id').inTable('users').onDelete('CASCADE');

        // Indexes
        table.index('conversation_id');
        table.index('sender_id');
        table.index('created_at');
        table.index('is_read');
        table.index(['conversation_id', 'is_read']);
      });
      console.log(' Chat messages table created');
    }
  } catch (error) {
    console.error('Error creating chat tables:', error);
  }
}


export async function runStartupSchemaSetup() {
  try {
    await ensureChatTables();
  } catch (e) {
    console.warn('Schema setup skipped/failed:', e.message);
  }
}
