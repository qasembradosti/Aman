import Brand from '../../models/brand.js';
import ProductImage from '../../models/productImage.js';

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

// Get all brands (public endpoint - for frontend)
export const getAllBrands = async (req, res) => {
  try {
    const { q, is_active, sort, order, limit, offset } = req.query;

    const filters = {
      q,
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
      sort,
      order,
      limit,
      offset,
    };

    const result = await Brand.findAll(filters);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brands',
      error: error.message,
    });
  }
};

// Get brand by id (public endpoint)
export const getBrandById = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found',
      });
    }

    res.json({
      success: true,
      data: brand,
    });
  } catch (error) {
    console.error('Error fetching brand:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brand',
      error: error.message,
    });
  }
};

// Get products by brand (public endpoint)
export const getBrandProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit, offset } = req.query;

    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found',
      });
    }

    const result = await Brand.getProducts(id, { limit, offset });
    const baseUrl = getBaseUrl(req);
    const products = result.data || result;
    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        const images = await ProductImage.listByProduct(product.id);
        return {
          ...product,
          images: images.map(img => {
            const imageUrl = toImageUrl(baseUrl, img.image_url);
            return {
              id: img.id,
              filename: img.image_url,
              url: imageUrl,
              image_url: imageUrl,
              is_main: !!img.is_main
            };
          })
        };
      })
    );

    res.json({
      success: true,
      brand,
      data: productsWithImages,
      meta: result.meta,
    });
  } catch (error) {
    console.error('Error fetching brand products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brand products',
      error: error.message,
    });
  }
};
