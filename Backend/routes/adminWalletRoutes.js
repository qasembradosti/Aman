import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireSuperAdminAccess } from '../middleware/adminPanelMiddleware.js';
import { 
  getAllWallets,
  getWalletByUserId,
  creditUserWallet,
  debitUserWallet,
  getWalletStats
} from '../controllers/admin/walletController.js';

const router = express.Router();

// Admin wallet management routes
router.get('/admin/wallets', authenticateToken, requireSuperAdminAccess, getAllWallets);
router.get('/admin/wallets/stats', authenticateToken, requireSuperAdminAccess, getWalletStats);
router.get('/admin/wallets/user/:userId', authenticateToken, requireSuperAdminAccess, getWalletByUserId);
router.post('/admin/wallets/user/:userId/credit', authenticateToken, requireSuperAdminAccess, creditUserWallet);
router.post('/admin/wallets/user/:userId/debit', authenticateToken, requireSuperAdminAccess, debitUserWallet);

export default router;
