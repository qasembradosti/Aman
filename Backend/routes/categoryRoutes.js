import express from 'express';
import { categoryValidation } from '../middleware/categoryValidation.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory
} from '../controllers/home/categoriesController.js';

const router = express.Router();
router.get('/categories', listCategories);
router.post('/categories', categoryValidation, validateRequest, createCategory);
router.patch('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

export default router;