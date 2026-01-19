import express from 'express';
import {
  getWithdrawalRequests,
  getWithdrawalRequestById,
  createWithdrawalRequest,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
  getWithdrawalStats,
  deleteWithdrawalRequest
} from '../controllers/withdrawalController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireSuperAdmin } from '../middleware/superAdminMiddleware.js';

const router = express.Router();

// User routes - create withdrawal request
router.post('/withdrawals', authenticateToken, createWithdrawalRequest);

// Admin routes - view all requests
router.get('/withdrawals', authenticateToken, getWithdrawalRequests);
router.get('/withdrawals/stats', authenticateToken, getWithdrawalStats);
router.get('/withdrawals/:id', authenticateToken, getWithdrawalRequestById);

// Superadmin routes - approve/reject/delete
router.post('/withdrawals/:id/approve', authenticateToken, requireSuperAdmin, approveWithdrawalRequest);
router.post('/withdrawals/:id/reject', authenticateToken, requireSuperAdmin, rejectWithdrawalRequest);
router.delete('/withdrawals/:id', authenticateToken, requireSuperAdmin, deleteWithdrawalRequest);

export default router;
