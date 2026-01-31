import knex from '../config/knex.js';

class Favorite {
  // Add product to favorites
  static async add(userId, productId) {
    if (!userId || !productId) throw new Error('User ID and Product ID are required');
    try {
      const [id] = await knex('favorites').insert({
        user_id: userId,
        product_id: productId
      });
      return { id, user_id: userId, product_id: productId };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
        throw new Error('Product already in favorites');
      }
      throw error;
    }
  }

  // Remove product from favorites
  static async remove(userId, productId) {
    if (!userId || !productId) throw new Error('User ID and Product ID are required');
    const deleted = await knex('favorites')
      .where({ user_id: userId, product_id: productId })
      .del();
    return deleted > 0;
  }

  // Check if product is favorited
  static async isFavorite(userId, productId) {
    if (!userId || !productId) return false;
    const favorite = await knex('favorites')
      .where({ user_id: userId, product_id: productId })
      .first();
    return !!favorite;
  }

  // Get all favorites for a user
  static async getUserFavorites(userId, limit = 100, offset = 0) {
    if (!userId) return [];
    
    const favorites = await knex('favorites')
      .join('products', 'favorites.product_id', 'products.id')
      .leftJoin('brands', 'products.brand_id', 'brands.id')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .where({ 'favorites.user_id': userId })
      .select(
        'favorites.id as favorite_id',
        'favorites.created_at as favorited_at',
        'products.*',
        'brands.name as brand_name',
        'categories.name as category_name',
        'categories.name_ar as category_name_ar',
        'categories.name_ku as category_name_ku'
      )
      .orderBy('favorites.created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    return favorites;
  }

  // Get favorites count for a user
  static async getUserFavoritesCount(userId) {
    if (!userId) return 0;
    const result = await knex('favorites')
      .where({ user_id: userId })
      .count('id as count')
      .first();
    return result.count;
  }

  // Get products with favorite status for a user
  static async getProductsWithFavoriteStatus(userId, productIds) {
    if (!userId || !productIds || productIds.length === 0) return [];
    
    const favorites = await knex('favorites')
      .whereIn('product_id', productIds)
      .where({ user_id: userId })
      .select('product_id');
    
    return favorites.map(f => f.product_id);
  }
}

export default Favorite;
