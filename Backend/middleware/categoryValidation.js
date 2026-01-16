import { body } from 'express-validator';

export const categoryValidation = [
  body('name').isString().isLength({ min: 2 }).withMessage('Category name must be at least 2 characters'),
];
