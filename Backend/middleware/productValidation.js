import { body } from 'express-validator';

export const productValidation = [
  body('name_en')
    .isString()
    .isLength({ min: 2 })
    .withMessage('Product name (English) must be at least 2 characters'),
  body('name_ku')
    .optional()
    .isString()
    .isLength({ min: 2 })
    .withMessage('Product name (Kurdish) must be at least 2 characters'),
  body('name_ar')
    .optional()
    .isString()
    .isLength({ min: 2 })
    .withMessage('Product name (Arabic) must be at least 2 characters'),
  body('base_price')
    .notEmpty()
    .withMessage('Base price is required')
    .custom((value) => {
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) {
        throw new Error('Base price must be greater than 0');
      }
      return true;
    }),
  body('category_id')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      const num = parseInt(value);
      if (isNaN(num)) {
        throw new Error('Category ID must be an integer');
      }
      return true;
    }),
];
