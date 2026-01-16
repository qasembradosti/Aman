import express from 'express';
import { imageUploader, documentUploader, avatarUploader } from '../utils/fileUploader.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err) {
    console.error('Upload error:', err);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum size is 20MB.' });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum is 10 files.' });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected field name in upload.' });
    }
    
    return res.status(400).json({ message: err.message || 'File upload error' });
  }
  next();
};

// Upload single image
router.post('/upload/image', authenticateToken, (req, res) => {
  console.log('=== UPLOAD IMAGE REQUEST ===');
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.get('content-type'));
  console.log('User:', req.user);
  
  imageUploader.single('file')(req, res, (err) => {
    if (err) {
      console.error('Image upload error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image size too large. Maximum size is 20MB.' });
      }
      
      return res.status(400).json({ message: err.message || 'Image upload failed' });
    }
    
    try {
      console.log('File received:', req.file);
      
      if (!req.file) {
        console.error('No file in request');
        return res.status(400).json({ message: 'No file uploaded' });
      }

      res.status(201).json({
        message: 'Image uploaded successfully',
        file: {
          filename: req.file.filename,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: `/images/${req.file.filename}`
        }
      });
    } catch (error) {
      console.error('Response error:', error);
      res.status(500).json({ message: 'Upload failed', error: error.message });
    }
  });
});

// Upload multiple images
router.post('/upload/images', authenticateToken, (req, res) => {
  imageUploader.array('files', 10)(req, res, (err) => {
    if (err) {
      console.error('Multiple images upload error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'One or more images are too large. Maximum size is 20MB per image.' });
      }
      
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: 'Too many files. Maximum is 10 images.' });
      }
      
      return res.status(400).json({ message: err.message || 'Images upload failed' });
    }
    
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const files = req.files.map(file => ({
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        url: `/images/${file.filename}`
      }));

      res.status(201).json({
        message: 'Images uploaded successfully',
        files
      });
    } catch (error) {
      console.error('Response error:', error);
      res.status(500).json({ message: 'Upload failed', error: error.message });
    }
  });
});

// Upload document
router.post('/upload/document', authenticateToken, (req, res) => {
  documentUploader.single('file')(req, res, (err) => {
    if (err) {
      console.error('Document upload error:', err);
      return res.status(400).json({ message: err.message || 'Document upload failed' });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      res.status(201).json({
        message: 'Document uploaded successfully',
        file: {
          filename: req.file.filename,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: `/documents/${req.file.filename}`
        }
      });
    } catch (error) {
      console.error('Response error:', error);
      res.status(500).json({ message: 'Upload failed', error: error.message });
    }
  });
});

// Upload avatar
router.post('/upload/avatar', authenticateToken, (req, res) => {
  avatarUploader.single('file')(req, res, (err) => {
    if (err) {
      console.error('Avatar upload error:', err);
      return res.status(400).json({ message: err.message || 'Avatar upload failed' });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      res.status(201).json({
        message: 'Avatar uploaded successfully',
        file: {
          filename: req.file.filename,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: `/avatars/${req.file.filename}`
        }
      });
    } catch (error) {
      console.error('Response error:', error);
      res.status(500).json({ message: 'Upload failed', error: error.message });
    }
  });
});

export default router;
