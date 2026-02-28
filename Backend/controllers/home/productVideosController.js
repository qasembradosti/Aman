import Product from '../../models/product.js';
import ProductVideo from '../../models/productVideo.js';
import fs from 'fs/promises';
import path from 'path';

const getBaseUrl = (req) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
};

const toVideoUrl = (baseUrl, videoPath) => {
  if (!videoPath) return null;
  if (String(videoPath).startsWith('http')) return videoPath;
  if (String(videoPath).startsWith('/')) return `${baseUrl}${videoPath}`;
  return `${baseUrl}/videos/products/${videoPath}`;
};

const getVideoFilename = (videoPath) => {
  if (!videoPath) return null;
  let pathname = String(videoPath);
  if (pathname.startsWith('http')) {
    try {
      pathname = new URL(pathname).pathname || pathname;
    } catch (err) {
      // keep raw path fallback
    }
  }
  pathname = pathname.split('?')[0].split('#')[0];
  const filename = path.basename(pathname);
  return filename && filename !== '.' && filename !== '/' ? filename : null;
};

const deleteUploadedVideoFile = async (videoPath) => {
  const filename = getVideoFilename(videoPath);
  if (!filename) return false;
  const filePath = path.resolve('public', 'videos', 'products', filename);
  try {
    await fs.unlink(filePath);
    return true;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('Failed to delete video file:', err.message);
    }
    return false;
  }
};

export const uploadProductVideos = async (req, res) => {
  try {
    const { id } = req.params; // product id
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    // Handle both req.file (single upload) and req.files (array upload)
    const videoFile = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
    
    if (!videoFile) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }
    
    const baseUrl = getBaseUrl(req);
    const previousVideo = await ProductVideo.findByProductId(product.id);
    
    // Construct the full video path
    const videoPath = `/videos/products/${videoFile.filename}`;
    
    // Add will automatically replace any existing video
    const rec = await ProductVideo.add(product.id, videoPath);
    if (previousVideo?.video_url) {
      await deleteUploadedVideoFile(previousVideo.video_url);
    }
    const url = toVideoUrl(baseUrl, rec.video_url);
    const video = { 
      id: rec.id, 
      filename: rec.video_url, 
      url, 
      video_url: url, 
      is_main: true // Always main since only one video
    };
    
    res.status(201).json({ video });
  } catch (err) {
    console.error('Upload video error:', err);
    res.status(500).json({ message: 'Failed to upload video', error: err.message });
  }
};

export const listProductVideos = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    const baseUrl = getBaseUrl(req);
    const rows = await ProductVideo.listByProduct(id);
    
    // Since only one video per product, return single video object or null
    if (rows.length === 0) {
      return res.json({ video: null });
    }
    
    const video = rows[0];
    const url = toVideoUrl(baseUrl, video.video_url);
    
    res.json({ 
      video: {
        id: video.id, 
        filename: video.video_url, 
        url, 
        video_url: url, 
        is_main: true
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list video', error: err.message });
  }
};

export const deleteProductVideo = async (req, res) => {
  try {
    const { id, videoId } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const existing = await ProductVideo.findById(videoId);
    if (!existing || Number(existing.product_id) !== Number(id)) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const deleted = await ProductVideo.delete(videoId);
    if (!deleted) {
      return res.status(404).json({ message: 'Video not found' });
    }

    await deleteUploadedVideoFile(existing.video_url);
    
    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete video', error: err.message });
  }
};

export const setMainProductVideo = async (req, res) => {
  try {
    const { id, videoId } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    const video = await ProductVideo.setMain(videoId, id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    const baseUrl = getBaseUrl(req);
    const url = toVideoUrl(baseUrl, video.video_url);
    
    res.json({ 
      video: {
        id: video.id, 
        filename: video.video_url, 
        url, 
        video_url: url, 
        is_main: !!video.is_main
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to set main video', error: err.message });
  }
};
