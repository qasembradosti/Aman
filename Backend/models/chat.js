import db from '../config/knex.js';

const Chat = {
  // Create a new conversation
  createConversation: async (conversationData) => {
    const [id] = await db('conversations').insert({
      ...conversationData,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
    return await Chat.getConversationById(id);
  },

  // Get conversation by ID
  getConversationById: async (id) => {
    return await db('conversations')
      .where('id', id)
      .first();
  },

  // Get user's conversations
  getUserConversations: async (userId) => {
    return await db('conversations')
      .where('user_id', userId)
      .orderBy('updated_at', 'desc');
  },

  // Get conversation by user and order
  getConversationByUserAndOrder: async (userId, orderId = null) => {
    if (!userId) {
      throw new Error('userId is required');
    }
    
    if (orderId) {
      const [rows] = await db.raw(
        'SELECT * FROM conversations WHERE user_id = ? AND order_id = ? LIMIT 1',
        [userId, orderId]
      );
      return rows[0] || null;
    } else {
      const [rows] = await db.raw(
        'SELECT * FROM conversations WHERE user_id = ? AND order_id IS NULL LIMIT 1',
        [userId]
      );
      return rows[0] || null;
    }
  },

  // Update conversation
  updateConversation: async (id, data) => {
    await db('conversations')
      .where('id', id)
      .update({
        ...data,
        updated_at: db.fn.now(),
      });
    return await Chat.getConversationById(id);
  },

  // Create a new message
  createMessage: async (messageData) => {
    const [id] = await db('chat_messages').insert({
      ...messageData,
      created_at: db.fn.now(),
    });

    // Update conversation's updated_at
    if (messageData.conversation_id) {
      await db('conversations')
        .where('id', messageData.conversation_id)
        .update({ updated_at: db.fn.now() });
    }

    return await Chat.getMessageById(id);
  },

  // Get message by ID
  getMessageById: async (id) => {
    return await db('chat_messages')
      .where('id', id)
      .first();
  },

  // Get messages for a conversation
  getConversationMessages: async (conversationId, limit = 100, offset = 0) => {
    return await db('chat_messages')
      .where('conversation_id', conversationId)
      .orderBy('created_at', 'asc')
      .limit(limit)
      .offset(offset);
  },

  // Mark messages as read
  markMessagesAsRead: async (conversationId, userId) => {
    await db('chat_messages')
      .where('conversation_id', conversationId)
      .whereNot('sender_id', userId)
      .where('is_read', false)
      .update({ is_read: true, read_at: db.fn.now() });
  },

  // Get unread message count for user
  getUnreadCount: async (userId) => {
    const result = await db('chat_messages')
      .join('conversations', 'chat_messages.conversation_id', 'conversations.id')
      .where('conversations.user_id', userId)
      .whereNot('chat_messages.sender_id', userId)
      .where('chat_messages.is_read', false)
      .count('chat_messages.id as count')
      .first();

    return result?.count || 0;
  },

  // Delete a conversation and its messages
  deleteConversation: async (id) => {
    await db('chat_messages').where('conversation_id', id).del();
    await db('conversations').where('id', id).del();
  },

  // Get admin conversations (for admin panel)
  getAdminConversations: async (status = 'all', limit = 50, offset = 0) => {
    const query = db('conversations')
      .select(
        'conversations.*',
        'users.username',
        'users.first_name',
        'users.last_name',
        'users.email',
        db.raw('(SELECT COUNT(*) FROM chat_messages WHERE conversation_id = conversations.id AND sender_type = "user" AND is_read = false) as unread_count')
      )
      .leftJoin('users', 'conversations.user_id', 'users.id')
      .orderBy('conversations.updated_at', 'desc');

    if (status !== 'all') {
      query.where('conversations.status', status);
    }

    return await query.limit(limit).offset(offset);
  },
};

export default Chat;
