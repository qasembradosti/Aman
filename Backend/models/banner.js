import db from '../config/knex.js';

class Banner {
  // Get all active banners
  static async getAllActive() {
    try {
      return await db('banners')
        .where('is_active', true)
        .orderBy('display_order', 'asc')
        .select('*');
    } catch (error) {
      throw new Error(`Error fetching active banners: ${error.message}`);
    }
  }

  // Get all banners (for admin)
  static async getAll() {
    try {
      return await db('banners')
        .orderBy('display_order', 'asc')
        .select('*');
    } catch (error) {
      throw new Error(`Error fetching banners: ${error.message}`);
    }
  }

  // Get banner by ID
  static async getById(id) {
    try {
      return await db('banners')
        .where('id', id)
        .first();
    } catch (error) {
      throw new Error(`Error fetching banner: ${error.message}`);
    }
  }

  // Create new banner
  static async create(bannerData) {
    try {
      const [id] = await db('banners').insert(bannerData);
      return await Banner.getById(id);
    } catch (error) {
      throw new Error(`Error creating banner: ${error.message}`);
    }
  }

  // Update banner
  static async update(id, bannerData) {
    try {
      await db('banners')
        .where('id', id)
        .update({
          ...bannerData,
          updated_at: db.fn.now()
        });
      return await Banner.getById(id);
    } catch (error) {
      throw new Error(`Error updating banner: ${error.message}`);
    }
  }

  // Delete banner
  static async delete(id) {
    try {
      return await db('banners')
        .where('id', id)
        .delete();
    } catch (error) {
      throw new Error(`Error deleting banner: ${error.message}`);
    }
  }

  // Toggle banner active status
  static async toggleActive(id) {
    try {
      const banner = await Banner.getById(id);
      if (!banner) {
        throw new Error('Banner not found');
      }
      await db('banners')
        .where('id', id)
        .update({
          is_active: !banner.is_active,
          updated_at: db.fn.now()
        });
      return await Banner.getById(id);
    } catch (error) {
      throw new Error(`Error toggling banner status: ${error.message}`);
    }
  }

  // Update display order
  static async updateOrder(orders) {
    try {
      const promises = orders.map(({ id, display_order }) =>
        db('banners')
          .where('id', id)
          .update({ display_order, updated_at: db.fn.now() })
      );
      await Promise.all(promises);
      return true;
    } catch (error) {
      throw new Error(`Error updating banner order: ${error.message}`);
    }
  }
}

export default Banner;
