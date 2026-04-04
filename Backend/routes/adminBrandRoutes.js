import express from 'express';
import {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  getBrandProducts,
} from '../controllers/admin/brandController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  requireAdminPanelAccess,
  requireSuperAdminAccess,
} from '../middleware/adminPanelMiddleware.js';

const router = express.Router();

// Admin routes - all require authentication
router.get('/admin/brands', authenticateToken, requireAdminPanelAccess, getAllBrands);
router.get('/admin/brands/:id', authenticateToken, requireAdminPanelAccess, getBrandById);
router.post('/admin/brands', authenticateToken, requireSuperAdminAccess, createBrand);
router.put('/admin/brands/:id', authenticateToken, requireSuperAdminAccess, updateBrand);
router.delete('/admin/brands/:id', authenticateToken, requireSuperAdminAccess, deleteBrand);
router.get('/admin/brands/:id/products', authenticateToken, requireAdminPanelAccess, getBrandProducts);

export default router;
