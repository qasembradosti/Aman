import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  registerPushToken,
  removePushToken,
  getPushToken,
} from '../controllers/pushTokenController.js';

const router = express.Router();

// Register push token
router.post('/register', authenticateToken, registerPushToken);

// Remove push token
router.delete('/remove', authenticateToken, removePushToken);

// Get current push token
router.get('/current', authenticateToken, getPushToken);

export default router;
