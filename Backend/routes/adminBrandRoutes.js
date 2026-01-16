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

const router = express.Router();

// Admin routes - all require authentication
router.get('/admin/brands', authenticateToken, getAllBrands);
router.get('/admin/brands/:id', authenticateToken, getBrandById);
router.post('/admin/brands', authenticateToken, createBrand);
router.put('/admin/brands/:id', authenticateToken, updateBrand);
router.delete('/admin/brands/:id', authenticateToken, deleteBrand);
router.get('/admin/brands/:id/products', authenticateToken, getBrandProducts);

export default router;
