import Product from '../../models/product.js';
import ProductImage from '../../models/productImage.js';
import ProductVideo from '../../models/productVideo.js';
import { isStoreAdmin } from '../../middleware/adminPanelMiddleware.js';
import { deliverBroadcastNotification } from '../../services/notificationDeliveryService.js';

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

const normalizeBoolean = (value) =>
  value === true ||
  value === 1 ||
  value === '1' ||
  value === 'true' ||
  value === 'on';

const parseListValue = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return value;
};

const listProductImages = async (req, productId) => {
  try {
    const baseUrl = getBaseUrl(req);
    const images = await ProductImage.listByProduct(productId);
    return images.map((img) => {
      const imageUrl = toImageUrl(baseUrl, img.image_url);
      return {
        id: img.id,
        filename: img.image_url,
        url: imageUrl,
        image_url: imageUrl,
        is_main: !!img.is_main,
      };
    });
  } catch (err) {
    console.error('Error fetching product images:', err.message);
    return [];
  }
};

const listProductVideos = async (req, productId) => {
  try {
    const baseUrl = getBaseUrl(req);
    const videos = await ProductVideo.listByProduct(productId);

    if (videos.length === 0) {
      return null;
    }

    const video = videos[0];
    const videoUrl = toVideoUrl(baseUrl, video.video_url);

    return {
      id: video.id,
      filename: video.video_url,
      url: videoUrl,
      video_url: videoUrl,
      is_main: true,
    };
  } catch (err) {
    console.error('Error fetching product videos:', err.message);
    return null;
  }
};

const maskRestrictedAdminPricing = (req, product, shouldMaskPricing = false) => {
  if (!product || !shouldMaskPricing || !isStoreAdmin(req.user)) {
    return product;
  }

  return {
    ...product,
    sell_price: null,
    commission_price: null,
  };
};

const appendMediaToProduct = async (req, product, options = {}) => {
  if (!product) return null;

  const images = await listProductImages(req, product.id);
  const video = await listProductVideos(req, product.id);

  const enrichedProduct = {
    ...product,
    discount_type: product.discount_type || 'percentage',
    images,
    video,
  };

  return maskRestrictedAdminPricing(req, enrichedProduct, options.maskPricing);
};

const appendMediaToProducts = async (req, result, options = {}) => {
  const products = result.data || result;
  const productsWithMedia = await Promise.all(
    products.map((product) => appendMediaToProduct(req, product, options)),
  );

  if (result.data) {
    return { ...result, data: productsWithMedia };
  }

  return productsWithMedia;
};

const getScopedProductFilters = (req, filters = {}) => {
  const scopedFilters = { ...filters };

  if (req.query.is_trend !== undefined) {
    scopedFilters.is_trend = parseInt(req.query.is_trend, 10);
  }

  if (req.query.is_important !== undefined) {
    scopedFilters.is_important = parseInt(req.query.is_important, 10);
  }

  if (isStoreAdmin(req.user)) {
    scopedFilters.store_id = Number(req.user.store_id);
  }

  return scopedFilters;
};

const assertStoreAdminOwnsProduct = (req, product) => {
  if (!isStoreAdmin(req.user)) {
    return null;
  }

  if (Number(product.store_id) !== Number(req.user.store_id)) {
    return {
      status: 403,
      body: { message: 'Access denied for products outside your assigned store.' },
    };
  }

  return null;
};

export const listProducts = async (req, res) => {
  try {
    const result = await Product.findAll(getScopedProductFilters(req, req.query));
    const response = await appendMediaToProducts(req, result);
    res.json(response);
  } catch (err) {
    res.status(500).json({ message: 'Failed to list products', error: err.message });
  }
};

export const listAdminProducts = async (req, res) => {
  try {
    const result = await Product.findAll(getScopedProductFilters(req, req.query));
    const response = await appendMediaToProducts(req, result, { maskPricing: true });
    res.json(response);
  } catch (err) {
    res.status(500).json({ message: 'Failed to list products', error: err.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const productData = {
      ...req.body,
      key_features: parseListValue(req.body?.key_features),
      colors: parseListValue(req.body?.colors),
    };

    const product = await Product.create(productData);

    let images = [];
    if (req.files && req.files.length > 0) {
      const saved = [];
      for (const [index, file] of req.files.entries()) {
        const record = await ProductImage.add(product.id, file.filename, {
          isMain: index === 0,
        });
        const imageUrl = toImageUrl(getBaseUrl(req), record.image_url);
        saved.push({
          id: record.id,
          filename: record.image_url,
          url: imageUrl,
          image_url: imageUrl,
          is_main: !!record.is_main,
        });
      }
      images = saved;
    }

    res.status(201).json({
      ...product,
      discount_type: product.discount_type || 'percentage',
      images,
    });
  } catch (err) {
    if (err.message === 'name and base_price are required') {
      return res.status(400).json({ message: err.message });
    }
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Duplicate entry' });
    }
    res.status(500).json({ message: 'Failed to create product', error: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const currentProduct = await Product.findById(id);

    if (!currentProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const storeOwnershipError = assertStoreAdminOwnsProduct(req, currentProduct);
    if (storeOwnershipError) {
      return res.status(storeOwnershipError.status).json(storeOwnershipError.body);
    }

    if (isStoreAdmin(req.user)) {
      const submittedKeys = Object.keys(req.body || {}).filter(
        (key) => req.body[key] !== undefined,
      );

      const invalidKeys = submittedKeys.filter((key) => key !== 'in_stock');
      if (invalidKeys.length > 0 || (req.files && req.files.length > 0)) {
        return res.status(403).json({
          message: 'Store admins can only update the in_stock status for products in their store.',
        });
      }

      if (!Object.prototype.hasOwnProperty.call(req.body || {}, 'in_stock')) {
        return res.status(400).json({
          message: 'in_stock is required for store admin product updates.',
        });
      }

      const product = await Product.update(id, {
        in_stock: normalizeBoolean(req.body.in_stock),
      });

      return res.json(await appendMediaToProduct(req, product, { maskPricing: true }));
    }

    const updateData = {
      ...req.body,
      key_features: parseListValue(req.body?.key_features),
      colors: parseListValue(req.body?.colors),
      in_stock:
        req.body?.in_stock !== undefined
          ? normalizeBoolean(req.body.in_stock)
          : req.body?.in_stock,
    };

    if (req.files && req.files.length > 0) {
      const imageFiles = req.files.filter((file) => file.mimetype.startsWith('image/'));
      const videoFiles = req.files.filter((file) => file.mimetype.startsWith('video/'));

      for (const file of imageFiles) {
        await ProductImage.add(id, file.filename, { isMain: false });
      }

      if (videoFiles.length > 0) {
        await ProductVideo.add(id, `/videos/products/${videoFiles[0].filename}`);
      }
    }

    const newDiscount = parseFloat(updateData.discount) || 0;
    const oldDiscount = parseFloat(currentProduct.discount) || 0;
    const product = await Product.update(id, updateData);

    if (newDiscount > 0 && newDiscount !== oldDiscount) {
      try {
        const discountText =
          updateData.discount_type === 'fixed'
            ? `IQD ${newDiscount} off`
            : `${newDiscount}% off`;

        const title = 'New Discount Available!';
        const message = `${product.name_en} now has ${discountText}! Don't miss out on this deal.`;

        await deliverBroadcastNotification({
          title,
          message,
          isGlobal: true,
          data: {
            route: `/product/${product.id}`,
            type: 'product-discount',
            productId: product.id,
            discount: newDiscount,
            discount_type: updateData.discount_type || 'percentage',
          },
        });
      } catch (notifError) {
        console.error('Failed to send discount notifications:', notifError);
      }
    }

    res.json(await appendMediaToProduct(req, product, { maskPricing: true }));
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

export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(await appendMediaToProduct(req, product));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch product', error: err.message });
  }
};

export const getAdminProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const storeOwnershipError = assertStoreAdminOwnsProduct(req, product);
    if (storeOwnershipError) {
      return res.status(storeOwnershipError.status).json(storeOwnershipError.body);
    }

    res.json(await appendMediaToProduct(req, product, { maskPricing: true }));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch product', error: err.message });
  }
};

export const updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, mode } = req.body || {};
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const storeOwnershipError = assertStoreAdminOwnsProduct(req, product);
    if (storeOwnershipError) {
      return res.status(storeOwnershipError.status).json(storeOwnershipError.body);
    }

    const q = Number(quantity);
    if (!Number.isFinite(q)) {
      return res.status(400).json({ message: 'quantity must be a number' });
    }

    let updated;
    if (mode === 'set') {
      updated = await Product.updateStock(id, q, true);
    } else {
      updated = await Product.updateStock(id, q, false);
    }

    if (!updated) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(updated);
  } catch (err) {
    const code = err.message === 'Insufficient stock' ? 409 : 500;
    res.status(code).json({ message: 'Failed to update stock', error: err.message });
  }
};
