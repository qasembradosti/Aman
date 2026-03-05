import express from 'express';
import { storeValidation } from '../middleware/storeValidation.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
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
router.get('/stores/:id/orders', authenticateToken, listStoreOrders);

// Admin routes (with authentication and validation)
router.post('/stores', authenticateToken, storeValidation, validateRequest, createStore);
router.patch('/stores/:id', authenticateToken, validateRequest, updateStore);
router.delete('/stores/:id', authenticateToken, deleteStore);

export default router;
