import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { 
  getAllWallets,
  getWalletByUserId,
  creditUserWallet,
  debitUserWallet,
  getWalletStats
} from '../controllers/admin/walletController.js';

const router = express.Router();

// Admin wallet management routes
router.get('/admin/wallets', authenticateToken, getAllWallets);
router.get('/admin/wallets/stats', authenticateToken, getWalletStats);
router.get('/admin/wallets/user/:userId', authenticateToken, getWalletByUserId);
router.post('/admin/wallets/user/:userId/credit', authenticateToken, creditUserWallet);
router.post('/admin/wallets/user/:userId/debit', authenticateToken, debitUserWallet);

export default router;
