import multer from 'multer';
import path from 'path';
import fs from 'fs';

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const videosDir = path.resolve('public', 'videos', 'products');
ensureDir(videosDir);

const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, videosDir);
  },
  filename: function (req, file, cb) {
    const productId = req.params?.id || 'unknown';
    const safeOriginal = (file.originalname || 'video')
      .toLowerCase()
      .replace(/[^a-z0-9.\-_]+/g, '_');
    const ext = path.extname(safeOriginal) || '.mp4';
    const base = path.basename(safeOriginal, ext);
    const name = `${productId}_${Date.now()}_${base}${ext}`;
    cb(null, name);
  }
});

const videoFileFilter = (req, file, cb) => {
  const allowed = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Only video files (MP4, MOV, AVI, WebM) are allowed'));
};

export const videoUpload = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 100 * 1024 * 1024, files: 5 }, // 100MB per file, up to 5 videos
});
