import express from 'express';
import { storeValidation } from '../middleware/storeValidation.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireSuperAdminAccess } from '../middleware/adminPanelMiddleware.js';
import {
    listStores,
    getStore,
    createStore,
    updateStore,
    deleteStore,
    listStoreOrders
} from '../controllers/home/storesController.js';

const router = express.Router();

// Public routes
router.get('/stores', listStores);
router.get('/stores/:id', getStore);
router.get('/stores/:id/orders', authenticateToken, requireSuperAdminAccess, listStoreOrders);

// Admin routes (with authentication and validation)
router.post('/stores', authenticateToken, requireSuperAdminAccess, storeValidation, validateRequest, createStore);
router.patch('/stores/:id', authenticateToken, requireSuperAdminAccess, validateRequest, updateStore);
router.delete('/stores/:id', authenticateToken, requireSuperAdminAccess, deleteStore);

export default router;
