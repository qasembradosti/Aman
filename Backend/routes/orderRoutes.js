import express from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderStats
} from '../controllers/orderController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Create new order (public endpoint for checkout) - MUST BE FIRST
router.post('/orders', createOrder);

// Get all orders (with pagination and filters)
router.get('/orders', authenticateToken, getOrders);

// Get order statistics
router.get('/orders/stats', authenticateToken, getOrderStats);

// Get single order
router.get('/orders/:id', getOrderById);

// Update order status
router.put('/orders/:id/status', authenticateToken, updateOrderStatus);

// Delete order
router.delete('/orders/:id', authenticateToken, deleteOrder);

export default router;
