import db from '../config/knex.js';

const Notification = {
  // Create a notification
  async create(data) {
    const { user_id, title, message, is_global = false } = data;
    const [id] = await db('notifications').insert({
      user_id,
      title,
      message,
      is_read: false,
      created_at: db.fn.now()
    });
    return this.findById(id);
  },
  
  // Find notification by ID
  async findById(id) {
    return await db('notifications')
      .where({ id })
      .first();
  },

  // Get user notifications
  async getUserNotifications(userId, options = {}) {
    const { limit = 20, offset = 0, unreadOnly = false } = options;
    
    let query = db('notifications')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    if (unreadOnly) {
      query = query.where({ is_read: false });
    }
    
    return await query;
  },

  // Mark as read
  async markAsRead(id, userId) {
    const updateCount = await db('notifications')
      .where({ id, user_id: userId })
      .update({ is_read: true });
    
    if (updateCount === 0) {
      return null;
    }
    return this.findById(id);
  },

  // Mark all as read for user
  async markAllAsRead(userId) {
    await db('notifications')
      .where({ user_id: userId, is_read: false })
      .update({ is_read: true });
    return { message: 'All notifications marked as read' };
  },

  // Get unread count
  async getUnreadCount(userId) {
    const result = await db('notifications')
      .where({ user_id: userId, is_read: false })
      .count('* as count')
      .first();
    return result.count;
  },

  // Delete notification (only non-global notifications)
  async delete(id, userId) {
    // First check if notification is global
    const notification = await this.findById(id);
    if (notification && notification.is_global) {
      return { error: 'Cannot delete global notifications', isGlobal: true };
    }
    return db('notifications')
      .where({ id, user_id: userId })
      .delete();
  },

  // Delete all for user (only non-global notifications)
  async deleteAll(userId) {
    return db('notifications')
      .where({ user_id: userId, is_global: false })
      .delete();
  },

  // Get all notifications (for admin)
  async getAllNotifications(options = {}) {
    const { limit = 100, offset = 0 } = options;
    
    return await db('notifications')
      .select('notifications.*', 'users.username as user_name', 'users.phone as user_phone')
      .leftJoin('users', 'notifications.user_id', 'users.id')
      .orderBy('notifications.created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }
};

export default Notification;
