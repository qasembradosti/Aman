import express from 'express';
import {
  getActiveBanners,
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerActive,
  updateBannerOrder,
  uploadBannerImage
} from '../controllers/bannerController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { imageUploader } from '../utils/fileUploader.js';
import { requireSuperAdminAccess } from '../middleware/adminPanelMiddleware.js';

const router = express.Router();

// Public routes
router.get('/banners/active', getActiveBanners);

// Admin routes (protected)
router.get('/banners', authenticateToken, requireSuperAdminAccess, getAllBanners);
router.get('/banners/:id', authenticateToken, requireSuperAdminAccess, getBannerById);
router.post('/banners', authenticateToken, requireSuperAdminAccess, imageUploader.single('image'), createBanner);
router.put('/banners/:id', authenticateToken, requireSuperAdminAccess, imageUploader.single('image'), updateBanner);
router.delete('/banners/:id', authenticateToken, requireSuperAdminAccess, deleteBanner);
router.patch('/banners/:id/toggle', authenticateToken, requireSuperAdminAccess, toggleBannerActive);
router.put('/banners/order/update', authenticateToken, requireSuperAdminAccess, updateBannerOrder);
router.post('/banners/upload', authenticateToken, requireSuperAdminAccess, imageUploader.single('image'), uploadBannerImage);

export default router;
