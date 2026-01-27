import multer from 'multer';
import path from 'path';
import fs from 'fs';

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const productsDir = path.resolve('public', 'images', 'products');
ensureDir(productsDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on file type
    if (file.mimetype.startsWith('video/')) {
      const videosDir = path.resolve('public', 'videos', 'products');
      ensureDir(videosDir);
      cb(null, videosDir);
    } else {
      cb(null, productsDir);
    }
  },
  filename: function (req, file, cb) {
    const productId = req.params?.id || 'unknown';
    const safeOriginal = (file.originalname || 'file')
      .toLowerCase()
      .replace(/[^a-z0-9.\-_]+/g, '_');
    const ext = path.extname(safeOriginal) || (file.mimetype.startsWith('video/') ? '.mp4' : '.png');
    const base = path.basename(safeOriginal, ext);
    const name = `${productId}_${Date.now()}_${base}${ext}`;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Only image files are allowed'));
};

// Flexible file filter for product updates (accepts images and videos)
const flexibleFileFilter = (req, file, cb) => {
  const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideos = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  const allAllowed = [...allowedImages, ...allowedVideos];
  
  if (allAllowed.includes(file.mimetype)) {
    return cb(null, true); // Accept the file
  }
  // Accept but will be ignored - prevents "Unexpected field" error
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 10 }, // 20MB per file, up to 10 files
});

// Flexible upload for product updates (accepts any media)
export const flexibleUpload = multer({
  storage,
  fileFilter: flexibleFileFilter,
  limits: { fileSize: 100 * 1024 * 1024, files: 15 }, // 100MB per file, up to 15 files
});
