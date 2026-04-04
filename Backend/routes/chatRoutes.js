import express from 'express';
import {
  createOrGetConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  getUnreadCount,
  closeConversation,
  reopenConversation,
  getAdminConversations,
  sendAdminMessage,
  closeAdminConversation,
} from '../controllers/chatController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireSuperAdmin } from '../middleware/superAdminMiddleware.js';

const router = express.Router();

// User routes (authenticated)
router.post('/conversation', authenticateToken, createOrGetConversation);
router.get('/conversations', authenticateToken, getUserConversations);
router.get('/conversation/:conversationId/messages', authenticateToken, getConversationMessages);
router.post('/message', authenticateToken, sendMessage);
router.get('/unread-count', authenticateToken, getUnreadCount);
router.patch('/conversation/:conversationId/close', authenticateToken, closeConversation);
router.patch('/conversation/:conversationId/reopen', authenticateToken, reopenConversation);

// Admin routes
router.get('/admin/conversations', authenticateToken, requireSuperAdmin, getAdminConversations);
router.post('/admin/message', authenticateToken, requireSuperAdmin, sendAdminMessage);
router.patch(
  '/admin/conversation/:conversationId/close',
  authenticateToken,
  requireSuperAdmin,
  closeAdminConversation
);
router.patch(
  '/admin/conversations/:conversationId/close',
  authenticateToken,
  requireSuperAdmin,
  closeAdminConversation
);

export default router;
