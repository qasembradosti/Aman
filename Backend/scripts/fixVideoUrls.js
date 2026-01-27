import db from '../config/knex.js';

/**
 * Fix video URLs in the database that don't have the full path
 * This script updates video_url values that don't start with '/' or 'http'
 */
async function fixVideoUrls() {
  try {
    console.log('🔍 Checking for videos with incorrect URLs...');
    
    // Get all videos
    const videos = await db('product_videos').select('*');
    
    console.log(`Found ${videos.length} total videos in database`);
    
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    
    for (const video of videos) {
      const currentUrl = video.video_url;
      
      // Check if URL needs fixing (doesn't start with / or http)
      if (!currentUrl.startsWith('/') && !currentUrl.startsWith('http')) {
        const newUrl = `/videos/products/${currentUrl}`;
        
        await db('product_videos')
          .where({ id: video.id })
          .update({ video_url: newUrl });
        
        console.log(`✅ Fixed video ${video.id}:`);
        console.log(`   Old: ${currentUrl}`);
        console.log(`   New: ${newUrl}`);
        
        fixedCount++;
      } else {
        alreadyCorrectCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Total videos: ${videos.length}`);
    console.log(`   Fixed: ${fixedCount}`);
    console.log(`   Already correct: ${alreadyCorrectCount}`);
    console.log('\n✅ Video URL fix completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing video URLs:', error);
    process.exit(1);
  }
}

fixVideoUrls();
