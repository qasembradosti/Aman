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
    
    // Handle both req.file (single upload) and req.files (array upload)
    const videoFile = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
    
    if (!videoFile) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }
    
    const baseUrl = getBaseUrl(req);
    
    // Construct the full video path
    const videoPath = `/videos/products/${videoFile.filename}`;
    
    // Add will automatically replace any existing video
    const rec = await ProductVideo.add(product.id, videoPath);
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
