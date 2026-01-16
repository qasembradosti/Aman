import express from 'express';
import {
  getNotifications,
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  deleteNotification,
  deleteAllNotifications,
  sendToUser,
  sendToAllUsers
} from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All notification routes require authentication
router.get('/notifications', authenticateToken, getNotifications);
router.get('/notifications/all', authenticateToken, getAllNotifications);
router.get('/notifications/unread-count', authenticateToken, getUnreadCount);
router.post('/notifications', authenticateToken, createNotification);
router.post('/notifications/send-to-user', authenticateToken, sendToUser);
router.post('/notifications/send-to-all', authenticateToken, sendToAllUsers);
router.put('/notifications/:id/read', authenticateToken, markAsRead);
router.put('/notifications/read-all', authenticateToken, markAllAsRead);
router.delete('/notifications/:id', authenticateToken, deleteNotification);
router.delete('/notifications', authenticateToken, deleteAllNotifications);

export default router;
