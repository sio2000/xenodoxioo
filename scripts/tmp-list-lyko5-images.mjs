import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(url, key);

const { data: units, error } = await supabase
  .from('units')
  .select('id, name, images, property_id')
  .ilike('name', '%Lykoskufi 5%');

if (error) {
  console.error('Query error:', error.message);
  process.exit(1);
}

for (const u of units) {
  console.log(`UNIT: ${u.name} (${u.id}) property=${u.property_id}`);
  let imgs = u.images;
  if (typeof imgs === 'string') {
    try { imgs = JSON.parse(imgs); } catch { imgs = [imgs]; }
  }
  if (Array.isArray(imgs)) {
    console.log(`COUNT: ${imgs.length}`);
    imgs.forEach((img, i) => console.log(`${i}: ${typeof img === 'string' ? img : JSON.stringify(img)}`));
  } else {
    console.log('images:', JSON.stringify(imgs));
  }
}
