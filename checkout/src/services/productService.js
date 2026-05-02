import api from './api';

const PRODUCTS_PAGE_SIZE = 100;
const PRODUCTS_MAX_PAGE_REQUESTS = 100;

const normalizeProductList = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const getReportedTotal = (payload) => {
  const candidates = [payload?.meta?.total, payload?.pagination?.total, payload?.total];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
};

const filterExcludedProduct = (products, excludeProductId) => {
  if (excludeProductId === undefined || excludeProductId === null) {
    return products;
  }

  return products.filter(
    (product) => String(product?.id ?? '') !== String(excludeProductId),
  );
};

const collectProducts = async (params = {}) => {
  const collected = [];
  const seenIds = new Set();
  let offset = 0;
  let requestCount = 0;

  while (requestCount < PRODUCTS_MAX_PAGE_REQUESTS) {
    const response = await api.get('/products', {
      params: {
        ...params,
        limit: PRODUCTS_PAGE_SIZE,
        offset,
      }
    });

    const payload = response.data;
    const pageItems = normalizeProductList(payload);
    const reportedTotal = getReportedTotal(payload);

    for (const item of pageItems) {
      const itemId = String(item?.id ?? '');
      if (!itemId || seenIds.has(itemId)) continue;
      seenIds.add(itemId);
      collected.push(item);
    }

    requestCount += 1;

    if (
      pageItems.length < PRODUCTS_PAGE_SIZE ||
      pageItems.length === 0 ||
      (reportedTotal !== null && collected.length >= reportedTotal)
    ) {
      break;
    }

    offset += PRODUCTS_PAGE_SIZE;
  }

  return collected;
};

export const productService = {
  // Get product by product_id
  getProduct: async (productId) => {
    try {
      const response = await api.get(`/products/${productId}`);
      console.log('Product fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },

  // Get all products
  getAllProducts: async (excludeProductId) => {
    try {
      const products = await collectProducts();
      return filterExcludedProduct(products, excludeProductId);
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Get related products by brand and category
  getRelatedProducts: async (brandId, categoryId, excludeProductId) => {
    try {
      const response = await api.get('/products', {
        params: {
          brand_id: brandId,
          category_id: categoryId,
          limit: 6
        }
      });
      const products = response.data.data || response.data;
      // Filter out the current product
      return products.filter(p => p.id !== excludeProductId);
    } catch (error) {
      console.error('Error fetching related products:', error);
      return [];
    }
  },

  // Get products by store ID
  getProductsByStore: async (storeId, excludeProductId) => {
    try {
      const products = await collectProducts({
        store_id: storeId,
      });
      return filterExcludedProduct(products, excludeProductId);
    } catch (error) {
      console.error('Error fetching store products:', error);
      return [];
    }
  }
};
