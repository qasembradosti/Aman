import express from 'express';
import {
  getAllBrands,
  getBrandById,
  getBrandProducts,
} from '../controllers/home/brandController.js';

const router = express.Router();

// Public routes
router.get('/brands', getAllBrands);
router.get('/brands/:id', getBrandById);
router.get('/brands/:id/products', getBrandProducts);

export default router;
