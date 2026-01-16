import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure directory exists
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Generic file uploader configuration
class FileUploader {
  constructor(options = {}) {
    this.uploadDir = options.uploadDir || path.resolve('public', 'uploads');
    this.allowedMimeTypes = options.allowedMimeTypes || [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
    this.maxFiles = options.maxFiles || 5;
    this.filePrefix = options.filePrefix || 'file';

    ensureDir(this.uploadDir);
  }

  // Create multer storage
  createStorage() {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        const sanitized = file.originalname
          .toLowerCase()
          .replace(/[^a-z0-9.\-_]+/g, '_');
        const ext = path.extname(sanitized) || '.bin';
        const base = path.basename(sanitized, ext);
        const name = `${this.filePrefix}_${Date.now()}_${base}${ext}`;
        cb(null, name);
      }
    });
  }

  // File filter
  createFileFilter() {
    return (req, file, cb) => {
      if (this.allowedMimeTypes.includes(file.mimetype)) {
        return cb(null, true);
      }
      cb(new Error(`File type not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`));
    };
  }

  // Create multer instance
  createUploader() {
    return multer({
      storage: this.createStorage(),
      fileFilter: this.createFileFilter(),
      limits: {
        fileSize: this.maxFileSize,
        files: this.maxFiles
      }
    });
  }

  // Delete file helper
  static deleteFile(filePath) {
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  // Get file URL
  static getFileUrl(filename, baseUrl = '') {
    return `${baseUrl}/uploads/${filename}`;
  }
}

// Preset configurations
export const imageUploader = new FileUploader({
  uploadDir: path.resolve('public', 'images'),
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxFileSize: 20 * 1024 * 1024, // 20MB
  maxFiles: 10,
  filePrefix: 'img'
}).createUploader();

export const documentUploader = new FileUploader({
  uploadDir: path.resolve('public', 'documents'),
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  filePrefix: 'doc'
}).createUploader();

export const avatarUploader = new FileUploader({
  uploadDir: path.resolve('public', 'avatars'),
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileSize: 2 * 1024 * 1024, // 2MB
  maxFiles: 1,
  filePrefix: 'avatar'
}).createUploader();

export default FileUploader;
