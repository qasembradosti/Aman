import { body } from 'express-validator';

export const storeValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Store name is required')
    .isLength({ max: 255 })
    .withMessage('Store name must not exceed 255 characters'),
  
  body('name_en')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('English name must not exceed 255 characters'),
  
  body('name_ar')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Arabic name must not exceed 255 characters'),
  
  body('name_ku')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Kurdish name must not exceed 255 characters'),
  
  body('description')
    .optional({ checkFalsy: true })
    .trim(),
  
  body('location')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must not exceed 255 characters'),
  
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Phone must not exceed 50 characters'),
  
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),
  
  body('image_url')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Image URL must not exceed 500 characters'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
];
