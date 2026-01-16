import express from 'express';
import { register, login, getProfile, updateProfile, changePassword, startPhoneVerification, verifyPhone, requestPasswordReset, resetPassword } from '../controllers/auth/authController.js';
import { registerValidation, loginValidation } from '../middleware/authValidation.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/auth/register
router.post('/auth/register', registerValidation, validateRequest, register);

// POST /api/auth/login
router.post('/auth/login', loginValidation, validateRequest, login);

// GET /api/auth/profile - Get current user profile (protected)
router.get('/auth/profile', authenticateToken, getProfile);

// PUT /api/auth/profile - Update profile (protected)
router.put('/auth/profile', authenticateToken, updateProfile);

// PUT /api/auth/change-password - Change password (protected)
router.put('/auth/change-password', authenticateToken, changePassword);

// POST /api/auth/verify-phone/start - send code (protected)
router.post('/auth/verify-phone/start', authenticateToken, startPhoneVerification);

// POST /api/auth/verify-phone/check - verify code (protected)
router.post('/auth/verify-phone/check', authenticateToken, verifyPhone);

// POST /api/auth/request-password-reset - public initiate reset
router.post('/auth/request-password-reset', requestPasswordReset);

// POST /api/auth/reset-password - public finalize reset
router.post('/auth/reset-password', resetPassword);

export default router;
