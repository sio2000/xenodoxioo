#!/usr/bin/env node
/**
 * Upload local uploads/ folder to Supabase Storage bucket "uploads"
 * Run: node scripts/upload-images-to-supabase.mjs
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const uploadsDir = join(root, 'uploads');

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('❌ Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const uploadsStat = statSync(uploadsDir, { throwIfNoEntry: false });
  if (!uploadsStat || !uploadsStat.isDirectory()) {
    console.error('❌ uploads/ folder not found');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  // Create bucket "uploads" if it doesn't exist (no MIME restriction for flexibility)
  const { error: bucketError } = await supabase.storage.createBucket('uploads', {
    public: true,
    fileSizeLimit: '50MB',
  });
  if (bucketError) {
    if (bucketError.message?.includes('already exists') || bucketError.message?.includes('duplicate')) {
      console.log('📦 Bucket "uploads" already exists');
    } else {
      console.error('❌ Failed to create bucket "uploads":', bucketError.message);
      console.error('   Run supabase-uploads-and-admin.sql in Supabase SQL Editor to create it manually.');
      process.exit(1);
    }
  } else {
    console.log('📦 Created bucket "uploads"');
  }

  const files = readdirSync(uploadsDir).filter((f) => /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(f));
  console.log(`📤 Found ${files.length} images in uploads/`);

  const extToMime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif' };
  let uploaded = 0;
  for (const filename of files) {
    const filepath = join(uploadsDir, filename);
    const buffer = readFileSync(filepath);
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const contentType = extToMime[ext] || 'image/jpeg';
    const { error } = await supabase.storage.from('uploads').upload(filename, buffer, {
      upsert: true,
      contentType,
    });
    if (error) {
      console.error(`  ❌ ${filename}:`, error.message);
    } else {
      console.log(`  ✅ ${filename}`);
      uploaded++;
    }
  }
  console.log(`\n✅ Uploaded ${uploaded}/${files.length} images to Supabase Storage (bucket: uploads)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
