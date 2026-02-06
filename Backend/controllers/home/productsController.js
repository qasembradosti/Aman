import Product from '../../models/product.js';
import ProductImage from '../../models/productImage.js';
import ProductVideo from '../../models/productVideo.js';
import Notification from '../../models/notification.js';
import db from '../../config/knex.js';

const getBaseUrl = (req) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
};

const toImageUrl = (baseUrl, imagePath) => {
  if (!imagePath) return null;
  if (String(imagePath).startsWith('http')) return imagePath;
  if (String(imagePath).startsWith('/')) return `${baseUrl}${imagePath}`;
  return `${baseUrl}/images/products/${imagePath}`;
};

const toVideoUrl = (baseUrl, videoPath) => {
  if (!videoPath) return null;
  if (String(videoPath).startsWith('http')) return videoPath;
  if (String(videoPath).startsWith('/')) return `${baseUrl}${videoPath}`;
  return `${baseUrl}/videos/products/${videoPath}`;
};

const listProductImages = async (req, productId) => {
  try {
    const baseUrl = getBaseUrl(req);
    const images = await ProductImage.listByProduct(productId);
    return images.map(img => {
      const imageUrl = toImageUrl(baseUrl, img.image_url);
      return {
        id: img.id,
        filename: img.image_url,
        url: imageUrl,
        image_url: imageUrl,
        is_main: !!img.is_main
      };
    });
  } catch (err) {
    console.error('Error fetching product images:', err.message);
    return []; // Return empty array on error
  }
};

const listProductVideos = async (req, productId) => {
  try {
    const baseUrl = getBaseUrl(req);
    const videos = await ProductVideo.listByProduct(productId);
    
    console.log(`[listProductVideos] Product ${productId}: Found ${videos.length} videos`);
    
    // Return single video object or null (only one video per product)
    if (videos.length === 0) {
      return null;
    }
    
    const vid = videos[0];
    
    const videoUrl = toVideoUrl(baseUrl, vid.video_url);

    return {
      id: vid.id,
      filename: vid.video_url,
      url: videoUrl,
      video_url: videoUrl,
      is_main: true // Always true since only one video
    };
  } catch (err) {
    console.error('Error fetching product videos:', err.message);
    return null; // Return null on error
  }
};

export const listProducts = async (req, res) => {
  try {
    const result = await Product.findAll(req.query);
    const products = result.data || result;
    
    // Fetch images and video for each product
    const productsWithMedia = await Promise.all(
      products.map(async (product) => {
        const images = await listProductImages(req, product.id);
        const video = await listProductVideos(req, product.id);
        return {
          ...product,
          discount_type: product.discount_type || 'percentage', // Ensure discount_type is always present
          images,
          video // Single video object or null
        };
      })
    );
    
    if (result.data) {
      res.json({ ...result, data: productsWithMedia });
    } else {
      res.json(productsWithMedia);
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to list products', error: err.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    // Parse key_features if it's a string
    const productData = { ...req.body };
    if (typeof productData.key_features === 'string') {
      try {
        productData.key_features = JSON.parse(productData.key_features);
      } catch (e) {
        productData.key_features = productData.key_features.split(',').map(f => f.trim());
      }
    }
    
    // Parse colors if it's a string
    if (typeof productData.colors === 'string') {
      try {
        productData.colors = JSON.parse(productData.colors);
      } catch (e) {
        productData.colors = productData.colors.split(',').map(c => c.trim()).filter(Boolean);
      }
    }
    
    const product = await Product.create(productData);
    // Persist uploaded images (if any) to product_images table
    let images = [];
    if (req.files && req.files.length > 0) {
      const saved = [];
      for (const [idx, f] of req.files.entries()) {
        // Store raw filename in image_url; first image becomes main by default
        const rec = await ProductImage.add(product.id, f.filename, { isMain: idx === 0 });
        const imageUrl = toImageUrl(getBaseUrl(req), rec.image_url);
        saved.push({
          id: rec.id,
          filename: rec.image_url,
          url: imageUrl,
          image_url: imageUrl,
          is_main: !!rec.is_main
        });
      }
      images = saved;
    }

    res.status(201).json({ 
      ...product, 
      discount_type: product.discount_type || 'percentage', // Ensure discount_type is always present
      images 
    });
  } catch (err) {
    if (err.message === 'name and base_price are required') {
      return res.status(400).json({ message: err.message });
    }
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Duplicate entry' });
    }
    res.status(500).json({ message: 'Failed to create product', error: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the current product to check for discount changes
    const currentProduct = await Product.findById(id);
    if (!currentProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const updateData = { ...req.body };
    console.log('Update Product - ID:', id, 'Update Data:', updateData); // Added log
    
    // Handle uploaded files if present (images and videos)
    if (req.files && req.files.length > 0) {
      console.log(`📁 Uploading ${req.files.length} new files for product ${id}`);
      
      // Separate images and videos
      const imageFiles = req.files.filter(f => f.mimetype.startsWith('image/'));
      const videoFiles = req.files.filter(f => f.mimetype.startsWith('video/'));
      
      // Handle images
      if (imageFiles.length > 0) {
        const { ProductImage } = await import('../models/productImage.js');
        
        for (const file of imageFiles) {
          const imageUrl = `/images/products/${file.filename}`;
          await ProductImage.create({
            product_id: id,
            image_url: imageUrl,
            is_main: false
          });
        }
      }
      
      // Handle videos
      if (videoFiles.length > 0) {
        const { ProductVideo } = await import('../models/productVideo.js');
        
        // Check if product already has a video
        const existingVideo = await ProductVideo.findByProductId(id);
        
        // Use the first video file
        const videoFile = videoFiles[0];
        const videoUrl = `/videos/products/${videoFile.filename}`;
        
        if (existingVideo) {
          // Update existing video
          await ProductVideo.update(existingVideo.id, {
            video_url: videoUrl,
            is_main: true
          });
        } else {
          // Create new video record
          await ProductVideo.create({
            product_id: id,
            video_url: videoUrl,
            is_main: true
          });
        }
      }
    }
    
    const newDiscount = parseFloat(updateData.discount) || 0;
    const oldDiscount = parseFloat(currentProduct.discount) || 0;
    
    const product = await Product.update(id, updateData);
    
    // Check if discount was added or increased
    if (newDiscount > 0 && newDiscount !== oldDiscount) {
      // Send notification to all users about the discount
      try {
        const users = await db('users').select('id');
        
        const discountText = updateData.discount_type === 'fixed' 
          ? `IQD ${newDiscount} off` 
          : `${newDiscount}% off`;
        
        const title = '🎉 New Discount Available!';
        const message = `${product.name_en} now has ${discountText}! Don't miss out on this deal.`;
        
        // Create notifications for all users (marked as global so users can't delete them)
        for (const user of users) {
          await Notification.create({
            user_id: user.id,
            title,
            message,
            is_global: true // Mark as global notification
          });
        }
        
        // Broadcast via Socket.io
        if (global.io) {
          global.io.emit('broadcast_notification', {
            title,
            message,
            product_id: product.id,
            discount: newDiscount,
            discount_type: updateData.discount_type || 'percentage',
            timestamp: new Date()
          });
        }
              } catch (notifError) {
        console.error('Failed to send discount notifications:', notifError);
        // Don't fail the update if notification fails
      }
    }
    
    const images = await listProductImages(req, product.id);
    const video = await listProductVideos(req, product.id);
    res.json({ 
      ...product, 
      discount_type: product.discount_type || 'percentage', // Ensure discount_type is always present
      images, 
      video 
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update product', error: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Product.delete(id);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete product', error: err.message });
  }
};

// Get single product
export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const images = await listProductImages(req, product.id);
    const video = await listProductVideos(req, product.id);
    res.json({ 
      ...product, 
      discount_type: product.discount_type || 'percentage', // Ensure discount_type is always present
      images, 
      video 
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch product', error: err.message });
  }
};

// Update product stock (increment or set absolute value)
export const updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, mode } = req.body || {};
    const q = Number(quantity);
    if (!Number.isFinite(q)) {
      return res.status(400).json({ message: 'quantity must be a number' });
    }
    let updated;
    if (mode === 'set') {
      updated = await Product.updateStock(id, q, true);
    } else {
      // default: increment (negative values allowed for decrement)
      updated = await Product.updateStock(id, q, false);
    }
    if (!updated) return res.status(404).json({ message: 'Product not found' });
    res.json(updated);
  } catch (err) {
    const code = err.message === 'Insufficient stock' ? 409 : 500;
    res.status(code).json({ message: 'Failed to update stock', error: err.message });
  }
};
