import express from 'express';
import { getWallet, debitWallet, listWalletTransactions, leaderboard } from '../controllers/home/walletController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Wallet operations: get wallet, withdraw and history
router.get('/wallet', authenticateToken, getWallet);
router.post('/wallet/withdraw', authenticateToken, debitWallet);
router.get('/wallet/history', authenticateToken, listWalletTransactions);

// Public leaderboard (no auth required)
router.get('/wallet/leaderboard', leaderboard);

export default router;
