import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/admin/userController.js';

const router = express.Router();

// Get all users (admin only)
router.get('/users', authenticateToken, getAllUsers);

// Get user by ID
router.get('/users/:id', authenticateToken, getUserById);

// Update user
router.put('/users/:id', authenticateToken, updateUser);

// Delete user
router.delete('/users/:id', authenticateToken, deleteUser);

export default router;
