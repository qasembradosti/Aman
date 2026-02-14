import db from '../config/knex.js';

async function fixBannerPaths() {
  try {
    console.log('Starting banner database fixes...\n');
    
    // 1. Add translation columns if they don't exist
    console.log('Step 1: Adding translation columns...');
    const hasColumns = await db.schema.hasColumn('banners', 'title_ar');
    
    if (!hasColumns) {
      await db.schema.table('banners', (table) => {
        table.string('title_ar', 255).nullable().after('title');
        table.string('title_ku', 255).nullable().after('title_ar');
        table.text('subtitle_ar').nullable().after('subtitle');
        table.text('subtitle_ku').nullable().after('subtitle_ar');
      });
      console.log('✅ Added translation columns: title_ar, title_ku, subtitle_ar, subtitle_ku\n');
    } else {
      console.log('ℹ️  Translation columns already exist\n');
    }
    
    // 2. Fix image paths from /images/products/ to /images/
    console.log('Step 2: Fixing banner image paths...');
    const result = await db('banners')
      .where('image_url', 'like', '/images/products/%')
      .update({
        image_url: db.raw("REPLACE(image_url, '/images/products/', '/images/')")
      });
    
    console.log(`✅ Fixed ${result} banner image path(s)\n`);
    
    // 3. Update existing banners with sample translations
    console.log('Step 3: Adding sample translations to existing banners...');
    const banners = await db('banners').select('*');
    
    for (const banner of banners) {
      if (!banner.title_ar && !banner.title_ku) {
        // Add sample translations based on common titles
        const updates = {};
        
        if (banner.title.toLowerCase().includes('special') || banner.title.toLowerCase().includes('offer')) {
          updates.title_ar = 'عروض خاصة';
          updates.title_ku = 'پێشکەشکردنی تایبەت';
        }
        
        if (banner.subtitle && (banner.subtitle.toLowerCase().includes('deal') || banner.subtitle.toLowerCase().includes('discover'))) {
          updates.subtitle_ar = 'اكتشف صفقات مذهلة';
          updates.subtitle_ku = 'دۆزینەوەی دیلی سەرسوڕهێنەر';
        }
        
        if (Object.keys(updates).length > 0) {
          await db('banners').where('id', banner.id).update(updates);
          console.log(`✅ Updated translations for banner: ${banner.title}`);
        }
      }
    }
    
    // 4. Show final results
    console.log('\n📊 Final banner status:');
    const finalBanners = await db('banners').select('id', 'title', 'title_ar', 'title_ku', 'subtitle', 'subtitle_ar', 'subtitle_ku', 'image_url');
    console.table(finalBanners);
    
    console.log('\n✅ All fixes completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing banner paths:', error);
    process.exit(1);
  }
}

fixBannerPaths();
