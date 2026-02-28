import { body } from 'express-validator';

export const uploadValidation = [
  body('images').custom((value, { req }) => {
    const hasSingle = !!req.file;
    const hasMany = Array.isArray(req.files) && req.files.length > 0;
    if (!hasSingle && !hasMany) {
      throw new Error('Image file is required');
    }
    return true;
  }),
];
