/**
 * ⚠️ WARNING: This script REPLACES all property main images with random picsum.photos URLs!
 * DO NOT RUN unless you want to destroy your real property images.
 * Use admin panel to upload proper images instead.
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAllImages() {
  try {
    console.log('🔧 Fixing ALL images...');
    
    const { data: properties, error } = await supabase.from('properties').select('*');
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    for (const prop of properties) {
      const newImage = `https://picsum.photos/400/300?random=${prop.id.slice(-8)}`;
      const { error: updateError } = await supabase
        .from('properties')
        .update({ main_image: newImage })
        .eq('id', prop.id);
        
      if (updateError) {
        console.error('❌ Update error:', updateError.message);
      } else {
        console.log('✅ Fixed:', prop.name, '→', newImage);
      }
    }
    
    console.log('🎉 All images fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixAllImages();
