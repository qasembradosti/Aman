import Notification from '../models/notification.js';
import {
  deliverBroadcastNotification,
  deliverNotificationToUser,
} from '../services/notificationDeliveryService.js';

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = Number(req.query.limit || 20);
    const offset = Number(req.query.offset || 0);
    const unreadOnly = req.query.unread === 'true';

    const notifications = await Notification.getUserNotifications(userId, {
      limit,
      offset,
      unreadOnly,
    });

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

export const getAllNotifications = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100);
    const offset = Number(req.query.offset || 0);

    const notifications = await Notification.getAllNotifications({
      limit,
      offset,
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

    const notification = await Notification.markAsRead(id, userId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

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
      message,
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

export const sendToUser = async (req, res) => {
  try {
    const { user_id, title, message } = req.body;

    if (!user_id || !title || !message) {
      return res.status(400).json({ message: 'user_id, title, and message are required' });
    }

    const notification = await deliverNotificationToUser({
      userId: user_id,
      title,
      message,
      data: {
        route: '/notifications',
        type: 'direct-notification',
      },
    });

    res.status(201).json({
      message: 'Notification sent to user',
      notification,
    });
  } catch (error) {
    console.error('Send to user error:', error);
    res.status(500).json({ message: 'Failed to send notification', error: error.message });
  }
};

export const sendToAllUsers = async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'title and message are required' });
    }

    const result = await deliverBroadcastNotification({
      title,
      message,
      isGlobal: true,
      data: {
        route: '/notifications',
        type: 'broadcast-notification',
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    res.status(201).json({
      message: `Notification sent to ${result.count} users`,
      count: result.count,
      sample: result.sampleNotification,
    });
  } catch (error) {
    console.error('Send to all users error:', error);
    res.status(500).json({ message: 'Failed to send notification', error: error.message });
  }
};
