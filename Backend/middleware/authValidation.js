import { body } from 'express-validator';

export const registerValidation = [
  body('username').isString().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').isEmail().withMessage('Email must be valid'),
  body('phone').notEmpty().withMessage('Phone number is required'),
];

export const loginValidation = [
  body('username').isString().notEmpty().withMessage('Username is required'),
  body('password').isString().notEmpty().withMessage('Password is required'),
];
