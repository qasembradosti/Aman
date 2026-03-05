import Notification from '../models/notification.js';
import { sendPushNotification, sendPushNotificationBatch } from '../services/expoPushService.js';
import db from '../config/knex.js';

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT middleware
    const limit = Number(req.query.limit || 20);
    const offset = Number(req.query.offset || 0);
    const unreadOnly = req.query.unread === 'true';

    const notifications = await Notification.getUserNotifications(userId, {
      limit,
      offset,
      unreadOnly
    });

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

// Get all notifications (admin only)
export const getAllNotifications = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100);
    const offset = Number(req.query.offset || 0);

    const notifications = await Notification.getAllNotifications({
      limit,
      offset
    });

    res.json(notifications);
  } catch (error) {
    console.error('Get all notifications error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const count = await Notification.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Failed to get unread count', error: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    console.log(`📖 markAsRead called - userId: ${userId}, notificationId: ${id}`);

    const notification = await Notification.markAsRead(id, userId);
    if (!notification) {
      console.log(`❌ Notification ${id} not found for user ${userId}`);
      return res.status(404).json({ message: 'Notification not found' });
    }

    console.log(` Notification ${id} marked as read`);
    res.json(notification);
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Failed to mark as read', error: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await Notification.markAllAsRead(userId);
    res.json(result);
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Failed to mark all as read', error: error.message });
  }
};

export const createNotification = async (req, res) => {
  try {
    const { user_id, title, message } = req.body;

    if (!user_id || !title || !message) {
      return res.status(400).json({ message: 'user_id, title, and message are required' });
    }

    const notification = await Notification.create({
      user_id,
      title,
      message
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ message: 'Failed to create notification', error: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await Notification.delete(id, userId);
    
    // Check if notification is global and cannot be deleted
    if (result && result.isGlobal) {
      return res.status(403).json({ message: 'Cannot delete global notifications' });
    }
    
    if (!result) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Failed to delete notification', error: error.message });
  }
};

export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    await Notification.deleteAll(userId);
    res.json({ message: 'All deletable notifications deleted (global notifications are preserved)' });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ message: 'Failed to delete notifications', error: error.message });
  }
};

// Send notification to a specific user
export const sendToUser = async (req, res) => {
  try {
    const { user_id, title, message } = req.body;

    if (!user_id || !title || !message) {
      return res.status(400).json({ message: 'user_id, title, and message are required' });
    }

    // Create notification in database
    const notification = await Notification.create({
      user_id,
      title,
      message
    });

    // Send real-time notification via Socket.io
    if (global.io) {
      global.io.to(`user:${user_id}`).emit('new_notification', notification);
    }

    // Send push notification if user has a push token (non-blocking)
    const user = await db('users').where({ id: user_id }).select('push_token').first();
    if (user?.push_token) {
      sendPushNotification(user.push_token, {
        title,
        body: message,
        data: { notificationId: notification.id }
      })
      .then(() => {
        console.log(`📱 Push notification sent to user ${user_id}`);
      })
      .catch(pushError => {
        console.error('⚠️ Push notification failed:', pushError.message);
      });
    }

    res.status(201).json({
      message: 'Notification sent to user',
      notification
    });
  } catch (error) {
    console.error('Send to user error:', error);
    res.status(500).json({ message: 'Failed to send notification', error: error.message });
  }
};

// Send notification to all users
export const sendToAllUsers = async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'title and message are required' });
    }

    // Get all users
    const users = await db('users').select('id', 'push_token');

    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    // Create one notification for each user (marked as global so users can't delete them)
    // Use batch insert for better performance
    const notificationData = users.map(user => ({
      user_id: user.id,
      title,
      message,
      is_global: true, // Mark as global notification
      is_read: false,
      created_at: new Date(),
      updated_at: new Date()
    }));

    // Batch insert all notifications at once
    const insertedIds = await db('notifications').insert(notificationData).returning('id');
    
    // Get first notification for response
    const sampleNotification = await db('notifications')
      .where({ id: insertedIds[0]?.id || insertedIds[0] })
      .first();

    // Broadcast to all connected users via Socket.io
    if (global.io) {
      global.io.emit('broadcast_notification', {
        title,
        message,
        timestamp: new Date()
      });
    }

    // Send push notifications asynchronously (don't wait for completion)
    const pushTokens = users
      .filter(user => user.push_token)
      .map(user => user.push_token);
    
    if (pushTokens.length > 0) {
      // Send push notifications in background without blocking response
      sendPushNotificationBatch(pushTokens, {
        title,
        body: message,
        data: { type: 'broadcast' }
      })
      .then(() => {
        console.log(`📱 Push notifications sent to ${pushTokens.length} devices`);
      })
      .catch(pushError => {
        console.error('⚠️ Batch push notification failed:', pushError.message);
      });
    }

    res.status(201).json({
      message: `Notification sent to ${users.length} users`,
      count: users.length,
      sample: sampleNotification // Return first notification as sample
    });
  } catch (error) {
    console.error('Send to all users error:', error);
    res.status(500).json({ message: 'Failed to send notification', error: error.message });
  }
};
