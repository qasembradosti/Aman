import Product from '../../models/product.js';
import ProductVideo from '../../models/productVideo.js';

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

export const uploadProductVideos = async (req, res) => {
  try {
    const { id } = req.params; // product id
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No video files uploaded' });
    }
    
    const baseUrl = getBaseUrl(req);
    const persisted = [];
    const existing = await ProductVideo.listByProduct(product.id);
    const hasMain = existing.some(vid => vid.is_main);
    
    for (const [idx, f] of req.files.entries()) {
      // If no main video exists yet, first of this batch becomes main
      const rec = await ProductVideo.add(product.id, f.filename, { isMain: !hasMain && idx === 0 });
      const url = toVideoUrl(baseUrl, rec.video_url);
      persisted.push({ 
        id: rec.id, 
        filename: rec.video_url, 
        url, 
        video_url: url, 
        is_main: !!rec.is_main 
      });
    }
    
    res.status(201).json({ videos: persisted });
  } catch (err) {
    res.status(500).json({ message: 'Failed to upload videos', error: err.message });
  }
};

export const listProductVideos = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    const baseUrl = getBaseUrl(req);
    const rows = await ProductVideo.listByProduct(id);
    const videos = rows.map(r => {
      const url = toVideoUrl(baseUrl, r.video_url);
      return {
        id: r.id, 
        filename: r.video_url, 
        url, 
        video_url: url, 
        is_main: !!r.is_main
      };
    });
    
    res.json({ videos });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list videos', error: err.message });
  }
};

export const deleteProductVideo = async (req, res) => {
  try {
    const { id, videoId } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    const deleted = await ProductVideo.delete(videoId);
    if (!deleted) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
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
