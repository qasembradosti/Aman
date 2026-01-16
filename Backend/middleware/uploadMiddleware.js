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
    cb(null, productsDir);
  },
  filename: function (req, file, cb) {
    const productId = req.params?.id || 'unknown';
    const safeOriginal = (file.originalname || 'image')
      .toLowerCase()
      .replace(/[^a-z0-9.\-_]+/g, '_');
    const ext = path.extname(safeOriginal) || '.png';
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

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 10 }, // 20MB per file, up to 10 files
});
