import express from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderStats,
  withdrawCommission
} from '../controllers/orderController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  requireAdminPanelAccess,
  requireSuperAdminAccess,
} from '../middleware/adminPanelMiddleware.js';

const router = express.Router();

// Create new order (public endpoint for checkout) - MUST BE FIRST
router.post('/orders', createOrder);

// Get all orders (with pagination and filters)
router.get('/orders', authenticateToken, getOrders);

// Get order statistics
router.get('/orders/stats', authenticateToken, requireSuperAdminAccess, getOrderStats);

// Get single order
router.get('/orders/:id', authenticateToken, getOrderById);

// Update order status
router.put('/orders/:id/status', authenticateToken, requireAdminPanelAccess, updateOrderStatus);

// Withdraw commission for delivered order
router.post('/orders/:id/withdraw-commission', authenticateToken, requireSuperAdminAccess, withdrawCommission);

// Delete order
router.delete('/orders/:id', authenticateToken, requireSuperAdminAccess, deleteOrder);

export default router;
