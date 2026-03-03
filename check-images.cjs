const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkImages() {
  try {
    console.log('🔍 CHECKING IMAGES...');
    
    const { data: properties, error } = await supabase.from('properties').select('id, name, main_image').limit(3);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    for (const prop of properties) {
      console.log(`Property: ${prop.name}`);
      console.log(`Image URL: ${prop.main_image}`);
      console.log('---');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkImages();
