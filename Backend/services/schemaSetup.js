import db from '../config/knex.js';

const defaultAboutSettings = {
  app_name: 'Amanly',
  tagline_en: 'Your Trusted Shopping Partner',
  tagline_ar: null,
  tagline_ku: null,
  about_text_en:
    'Amanly Store is your one-stop destination for quality products at great prices. We connect you with trusted sellers and ensure a seamless shopping experience from browsing to delivery.',
  about_text_ar: null,
  about_text_ku: null,
  support_email: 'support@aman-store.com',
  support_phone: '+9647501234567',
  support_whatsapp: '+9647501234567',
  website_url: 'https://aman-store.com',
};

const defaultFaqItems = [
  {
    question_en: 'How do I place an order?',
    answer_en:
      "To place an order, browse our products, add items to your cart, and proceed to checkout. You'll need to provide shipping details and payment information to complete your purchase.",
    question_ar: null,
    answer_ar: null,
    question_ku: null,
    answer_ku: null,
  },
  {
    question_en: 'What payment methods do you accept?',
    answer_en:
      'We accept various payment methods including credit/debit cards, PayPal, and cash on delivery. All transactions are secure and encrypted.',
    question_ar: null,
    answer_ar: null,
    question_ku: null,
    answer_ku: null,
  },
  {
    question_en: 'How long does shipping take?',
    answer_en:
      "Standard shipping typically takes 3-7 business days. Express shipping is available for faster delivery. You'll receive tracking information once your order ships.",
    question_ar: null,
    answer_ar: null,
    question_ku: null,
    answer_ku: null,
  },
  {
    question_en: 'How can I track my order?',
    answer_en:
      'You can track your order by going to the Orders section in your profile. Each order has a tracking number that you can use to monitor its status.',
    question_ar: null,
    answer_ar: null,
    question_ku: null,
    answer_ku: null,
  },
  {
    question_en: 'What is your return policy?',
    answer_en:
      'We offer a 30-day return policy for most items. Products must be unused and in original packaging. Contact support to initiate a return.',
    question_ar: null,
    answer_ar: null,
    question_ku: null,
    answer_ku: null,
  },
  {
    question_en: 'Can I cancel my order?',
    answer_en:
      'You can cancel your order within 24 hours of placing it. Go to your Orders page and select the order you wish to cancel. After 24 hours, cancellation may not be possible.',
    question_ar: null,
    answer_ar: null,
    question_ku: null,
    answer_ku: null,
  },
  {
    question_en: "I'm having trouble with my account",
    answer_en:
      "If you're experiencing account issues, try resetting your password. If problems persist, contact our support team with your account details.",
    question_ar: null,
    answer_ar: null,
    question_ku: null,
    answer_ku: null,
  },
  {
    question_en: 'How does the wallet work?',
    answer_en:
      'Your wallet stores funds that you can use for purchases. You can add money to your wallet and earn bonuses through sales. Funds can be withdrawn to your bank account.',
    question_ar: null,
    answer_ar: null,
    question_ku: null,
    answer_ku: null,
  },
];

async function seedDefaultAboutSettings() {
  const existing = await db('about_settings').first('id');
  if (existing) return;

  await db('about_settings').insert({
    ...defaultAboutSettings,
    created_at: db.fn.now(),
    updated_at: db.fn.now(),
  });
}

async function seedDefaultFaqItems() {
  const countRow = await db('faq_items').count({ total: '*' }).first();
  const total = Number(countRow?.total || 0);
  if (total > 0) return;

  const rows = defaultFaqItems.map((item, index) => ({
    ...item,
    sort_order: index + 1,
    is_active: true,
    created_at: db.fn.now(),
    updated_at: db.fn.now(),
  }));

  await db('faq_items').insert(rows);
}

export async function ensureContentTables() {
  try {
    const aboutSettingsExists = await db.schema.hasTable('about_settings');
    if (!aboutSettingsExists) {
      await db.schema.createTable('about_settings', (table) => {
        table.increments('id').primary();
        table.string('app_name', 120).defaultTo('Amanly');
        table.string('tagline_en', 255).nullable();
        table.string('tagline_ar', 255).nullable();
        table.string('tagline_ku', 255).nullable();
        table.text('about_text_en').nullable();
        table.text('about_text_ar').nullable();
        table.text('about_text_ku').nullable();
        table.string('support_email', 255).nullable();
        table.string('support_phone', 60).nullable();
        table.string('support_whatsapp', 60).nullable();
        table.string('website_url', 255).nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log(' About settings table created');
    }

    const faqItemsExists = await db.schema.hasTable('faq_items');
    if (!faqItemsExists) {
      await db.schema.createTable('faq_items', (table) => {
        table.increments('id').primary();
        table.text('question_en').nullable();
        table.text('question_ar').nullable();
        table.text('question_ku').nullable();
        table.text('answer_en').nullable();
        table.text('answer_ar').nullable();
        table.text('answer_ku').nullable();
        table.integer('sort_order').notNullable().defaultTo(0);
        table.boolean('is_active').notNullable().defaultTo(true);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.index('sort_order');
        table.index('is_active');
      });
      console.log(' FAQ items table created');
    }

    await seedDefaultAboutSettings();
    await seedDefaultFaqItems();
  } catch (error) {
    console.error('Error creating content tables:', error);
  }
}


export async function runStartupSchemaSetup() {
  try {
    await ensureContentTables();
  } catch (e) {
    console.warn('Schema setup skipped/failed:', e.message);
  }
}
