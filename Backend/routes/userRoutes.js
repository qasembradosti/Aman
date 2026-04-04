import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireSuperAdminAccess } from '../middleware/adminPanelMiddleware.js';
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/admin/userController.js';

const router = express.Router();

// Get all users (admin only)
router.get('/users', authenticateToken, requireSuperAdminAccess, getAllUsers);

// Create user
router.post('/users', authenticateToken, requireSuperAdminAccess, createUser);

// Get user by ID
router.get('/users/:id', authenticateToken, requireSuperAdminAccess, getUserById);

// Update user
router.put('/users/:id', authenticateToken, requireSuperAdminAccess, updateUser);

// Delete user
router.delete('/users/:id', authenticateToken, requireSuperAdminAccess, deleteUser);

export default router;
