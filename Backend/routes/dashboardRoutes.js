import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireSuperAdminAccess } from '../middleware/adminPanelMiddleware.js';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard/stats', authenticateToken, requireSuperAdminAccess, getDashboardStats);

export default router;
