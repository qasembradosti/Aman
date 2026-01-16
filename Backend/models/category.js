import db from '../config/knex.js';

const Category = {
  // Find all categories with filters
  findAll: async (filters = {}) => {
    const { q, parent_id, limit = 50, offset = 0 } = filters;
    const l = Math.min(parseInt(limit, 10) || 50, 200);
    const o = parseInt(offset, 10) || 0;

    const query = db('categories');
    
    if (q) {
      query.whereILike('name', `%${q}%`);
    }
    
    if (parent_id !== undefined) {
      if (parent_id === '' || parent_id === 'null') {
        query.whereNull('parent_id');
      } else {
        query.where('parent_id', parent_id);
      }
    }

    const totalRow = await query.clone().clearSelect().clearOrder().count({ total: '*' }).first();
    const total = Number(totalRow?.total || 0);

    const rows = await query.clone().orderBy('name').limit(l).offset(o);
    
    return { data: rows, meta: { total, limit: l, offset: o } };
  },

  // Find category by id
  findById: async (id) => db('categories').where({ id }).first(),

  // Find category by slug
  findBySlug: async (slug) => db('categories').where({ slug }).first(),

  // Create a new category
  create: async (categoryData) => {
    const { name, name_en, name_ar, name_ku, slug, description, parent_id, image_url } = categoryData;
    
    if (!name) {
      throw new Error('name is required');
    }

    const [id] = await db('categories').insert({
      name,
      name_en: name_en || null,
      name_ar: name_ar || null,
      name_ku: name_ku || null,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description: description || null,
      parent_id: parent_id || null,
      image_url: image_url || null,
    });

    return await Category.findById(id);
  },

  // Update category
  update: async (id, categoryData) => {
    const updates = { ...categoryData };
    delete updates.id;

    const affected = await db('categories').where({ id }).update(updates);
    
    if (!affected) {
      return null;
    }

    return await Category.findById(id);
  },

  // Delete category
  delete: async (id) => {
    const affected = await db('categories').where({ id }).del();
    return affected > 0;
  },

  // Get subcategories
  getSubcategories: async (parentId) => {
    return db('categories').where({ parent_id: parentId }).orderBy('name');
  },
};

export default Category;
