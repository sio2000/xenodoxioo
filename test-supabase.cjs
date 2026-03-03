const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fullDiagnostic() {
  try {
    console.log('🔍 FULL SUPABASE DIAGNOSTIC');
    console.log('URL:', process.env.SUPABASE_URL);
    console.log('Service Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Test all tables
    const tables = ['users', 'properties', 'units', 'bookings', 'coupons', 'payments', 'reviews'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('count');
        console.log(`${table}: ${error ? '❌ ERROR' : '✅ OK'}${error ? ' - ' + error.message : ''}`);
      } catch (e) {
        console.log(`${table}: ❌ EXCEPTION - ${e.message}`);
      }
    }
    
    // Test actual data
    console.log('\n📊 DATA COUNTS:');
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*');
        if (!error) {
          console.log(`${table}: ${data.length} records`);
        }
      } catch (e) {}
    }
    
  } catch (error) {
    console.error('❌ CONNECTION ERROR:', error.message);
  }
}

fullDiagnostic();
