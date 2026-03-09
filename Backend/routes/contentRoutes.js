import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireSuperAdmin } from '../middleware/superAdminMiddleware.js';
import {
  getAboutScreenContent,
  getAdminAboutContent,
  updateAboutContent,
  listAdminFaqItems,
  createFaqItem,
  updateFaqItem,
  deleteFaqItem,
} from '../controllers/contentController.js';

const router = express.Router();

// Public route used by mobile app
router.get('/content/about-screen', getAboutScreenContent);

// Admin routes for editing about + FAQ content
router.get('/admin/content/about-screen', authenticateToken, requireSuperAdmin, getAdminAboutContent);
router.patch('/admin/content/about-screen', authenticateToken, requireSuperAdmin, updateAboutContent);

router.get('/admin/content/faqs', authenticateToken, requireSuperAdmin, listAdminFaqItems);
router.post('/admin/content/faqs', authenticateToken, requireSuperAdmin, createFaqItem);
router.patch('/admin/content/faqs/:id', authenticateToken, requireSuperAdmin, updateFaqItem);
router.delete('/admin/content/faqs/:id', authenticateToken, requireSuperAdmin, deleteFaqItem);

export default router;
