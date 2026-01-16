import { body } from 'express-validator';

export const uploadValidation = [
  body('image').custom((value, { req }) => {
    if (!req.file) {
      throw new Error('Image file is required');
    }
    return true;
  }),
];
