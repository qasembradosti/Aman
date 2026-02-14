import db from '../config/knex.js';

async function addBannerTranslationColumns() {
  try {
    console.log('Starting to add banner translation columns...');
    
    // Check if columns already exist
    const hasColumns = await db.schema.hasColumn('banners', 'title_ar');
    
    if (!hasColumns) {
      await db.schema.table('banners', (table) => {
        table.string('title_ar', 255).nullable().after('title');
        table.string('title_ku', 255).nullable().after('title_ar');
        table.text('subtitle_ar').nullable().after('subtitle');
        table.text('subtitle_ku').nullable().after('subtitle_ar');
      });
      console.log('✅ Added translation columns: title_ar, title_ku, subtitle_ar, subtitle_ku');
    } else {
      console.log('ℹ️  Translation columns already exist');
    }
    
    // Show current banner structure
    const banners = await db('banners').select('*').limit(1);
    if (banners.length > 0) {
      console.log('\nBanner table columns:', Object.keys(banners[0]));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding translation columns:', error);
    process.exit(1);
  }
}

addBannerTranslationColumns();
