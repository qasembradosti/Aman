import api from './api';

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
  getAllProducts: async () => {
    try {
      const response = await api.get('/products');
      return response.data;
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
  }
};
