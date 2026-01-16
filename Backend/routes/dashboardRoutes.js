import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard/stats', authenticateToken, getDashboardStats);

export default router;
