import db from '../config/knex.js';

const ABOUT_FIELDS = [
  'app_name',
  'tagline_en',
  'tagline_ar',
  'tagline_ku',
  'about_text_en',
  'about_text_ar',
  'about_text_ku',
  'support_email',
  'support_phone',
  'support_whatsapp',
  'website_url',
];

const FAQ_FIELDS = [
  'question_en',
  'question_ar',
  'question_ku',
  'answer_en',
  'answer_ar',
  'answer_ku',
  'sort_order',
  'is_active',
];

const pickFields = (payload, allowedFields) => {
  const output = {};
  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      output[field] = payload[field];
    }
  });
  return output;
};

const Content = {
  getAboutSettings: async () => {
    const row = await db('about_settings').orderBy('id', 'asc').first();

    if (row) return row;

    const [id] = await db('about_settings').insert({
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return db('about_settings').where({ id }).first();
  },

  updateAboutSettings: async (data) => {
    const current = await Content.getAboutSettings();
    const fields = pickFields(data, ABOUT_FIELDS);

    if (Object.keys(fields).length === 0) {
      return current;
    }

    fields.updated_at = db.fn.now();
    await db('about_settings').where({ id: current.id }).update(fields);
    return Content.getAboutSettings();
  },

  listFaqs: async (activeOnly = true) => {
    const query = db('faq_items')
      .select('*')
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc');

    if (activeOnly) {
      query.where('is_active', true);
    }

    return query;
  },

  getFaqById: async (id) => {
    return db('faq_items').where({ id }).first();
  },

  createFaq: async (data) => {
    const fields = pickFields(data, FAQ_FIELDS);

    if (fields.sort_order === undefined) {
      const maxSortOrder = await db('faq_items').max({ max: 'sort_order' }).first();
      fields.sort_order = Number(maxSortOrder?.max || 0) + 1;
    }

    if (fields.is_active === undefined) {
      fields.is_active = true;
    }

    const [id] = await db('faq_items').insert({
      ...fields,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return Content.getFaqById(id);
  },

  updateFaq: async (id, data) => {
    const fields = pickFields(data, FAQ_FIELDS);
    if (Object.keys(fields).length === 0) {
      return Content.getFaqById(id);
    }

    fields.updated_at = db.fn.now();
    const updated = await db('faq_items').where({ id }).update(fields);
    if (!updated) return null;

    return Content.getFaqById(id);
  },

  deleteFaq: async (id) => {
    const deleted = await db('faq_items').where({ id }).del();
    return deleted > 0;
  },
};

export default Content;
