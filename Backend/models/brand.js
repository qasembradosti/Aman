import db from '../config/knex.js';

const Brand = {
  // Find all brands with filters
  findAll: async (filters = {}) => {
    const {
      q,
      is_active,
      sort = 'name',
      order = 'asc',
      limit = 50,
      offset = 0,
    } = filters;

    const query = db('brands');

    // Search filter
    if (q) {
      query.where(function () {
        this.whereILike('name', `%${q}%`)
          .orWhereILike('description', `%${q}%`);
      });
    }

    // Active filter
    if (is_active !== undefined) {
      query.where('is_active', is_active);
    }

    // Get total count
    const totalRow = await query.clone().clearSelect().clearOrder().count({ total: '*' }).first();
    const total = Number(totalRow?.total || 0);

    // Apply sorting and pagination
    const validSortFields = ['created_at', 'name', 'updated_at'];
    const sortField = validSortFields.includes(sort) ? sort : 'name';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    const brands = await query
      .orderBy(sortField, sortOrder)
      .limit(parseInt(limit) || 50)
      .offset(parseInt(offset) || 0);

    return {
      data: brands,
      meta: {
        total,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
      },
    };
  },

  // Find brand by id
  findById: async (id) => db('brands').where({ id }).first(),

  // Find brand by name
  findByName: async (name) => db('brands').where({ name }).first(),



  // Create a new brand
  create: async (brandData) => {
    const {
      name,
      logo_url,
      description,
      website,
      is_active = true,
    } = brandData;

    if (!name) {
      throw new Error('name is required');
    }

    // Check if brand already exists by name
    const existingBrand = await Brand.findByName(name);
    if (existingBrand) {
      throw new Error('Brand with this name already exists');
    }

    const [id] = await db('brands').insert({
      name,
      logo_url: logo_url || null,
      description: description || null,
      website: website || null,
      is_active,
    });

    return Brand.findById(id);
  },

  // Update a brand
  update: async (id, updateData) => {
    const {
      name,
      logo_url,
      description,
      website,
      is_active,
    } = updateData;

    const brand = await Brand.findById(id);
    if (!brand) {
      throw new Error('Brand not found');
    }

    // Check if new name conflicts with existing brand
    if (name && name !== brand.name) {
      const existingBrand = await Brand.findByName(name);
      if (existingBrand) {
        throw new Error('Brand with this name already exists');
      }
    }

    const dataToUpdate = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (logo_url !== undefined) dataToUpdate.logo_url = logo_url;
    if (description !== undefined) dataToUpdate.description = description;
    if (website !== undefined) dataToUpdate.website = website;
    if (is_active !== undefined) dataToUpdate.is_active = is_active;

    if (Object.keys(dataToUpdate).length > 0) {
      await db('brands').where({ id }).update(dataToUpdate);
    }

    return Brand.findById(id);
  },

  // Delete a brand
  delete: async (id) => {
    const brand = await Brand.findById(id);
    if (!brand) {
      throw new Error('Brand not found');
    }

    // Set brand_id to null for all products associated with this brand
    await db('products').where({ brand_id: id }).update({ brand_id: null });

    // Delete the brand
    await db('brands').where({ id }).delete();
    return true;
  },

  // Get products by brand
  getProducts: async (brandId, filters = {}) => {
    const {
      limit = 20,
      offset = 0,
    } = filters;

    const query = db('products')
      .where({ brand_id: brandId })
      .select('*');

    const totalRow = await query.clone().clearSelect().clearOrder().count({ total: '*' }).first();
    const total = Number(totalRow?.total || 0);

    const products = await query
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit) || 20)
      .offset(parseInt(offset) || 0);

    return {
      data: products,
      meta: {
        total,
        limit: parseInt(limit) || 20,
        offset: parseInt(offset) || 0,
      },
    };
  },
};

export default Brand;
