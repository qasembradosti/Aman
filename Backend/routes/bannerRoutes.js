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

const router = express.Router();

// Public routes
router.get('/banners/active', getActiveBanners);

// Admin routes (protected)
router.get('/banners', authenticateToken, getAllBanners);
router.get('/banners/:id', authenticateToken, getBannerById);
router.post('/banners', authenticateToken, createBanner);
router.put('/banners/:id', authenticateToken, updateBanner);
router.delete('/banners/:id', authenticateToken, deleteBanner);
router.patch('/banners/:id/toggle', authenticateToken, toggleBannerActive);
router.put('/banners/order/update', authenticateToken, updateBannerOrder);
router.post('/banners/upload', authenticateToken, imageUploader.single('image'), uploadBannerImage);

export default router;
