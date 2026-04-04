import express from 'express';
import { categoryValidation } from '../middleware/categoryValidation.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireSuperAdminAccess } from '../middleware/adminPanelMiddleware.js';
import {
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory
} from '../controllers/home/categoriesController.js';

const router = express.Router();
router.get('/categories', listCategories);
router.post('/categories', authenticateToken, requireSuperAdminAccess, categoryValidation, validateRequest, createCategory);
router.patch('/categories/:id', authenticateToken, requireSuperAdminAccess, updateCategory);
router.delete('/categories/:id', authenticateToken, requireSuperAdminAccess, deleteCategory);

export default router;
