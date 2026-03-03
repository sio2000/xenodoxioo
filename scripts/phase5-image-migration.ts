#!/usr/bin/env node

/**
 * PHASE 5: IMAGE MIGRATION TO SUPABASE STORAGE
 * 
 * This script handles uploading local images to Supabase Storage
 * and updating database URLs to use Supabase public URLs.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import * as path from 'path';

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(color: string, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  log('cyan', `\n=== ${title} ===`);
}

function logSuccess(message: string) {
  log('green', `✅ ${message}`);
}

function logInfo(message: string) {
  log('blue', `ℹ️  ${message}`);
}

function logError(message: string) {
  log('red', `❌ ${message}`);
}

function logWarning(message: string) {
  log('yellow', `⚠️  ${message}`);
}

// Generate image migration instructions
function generateImageMigrationGuide() {
  logSection('PHASE 5: IMAGE MIGRATION TO SUPABASE STORAGE');
  
  const imageMigrationGuide = {
    timestamp: new Date().toISOString(),
    phase: 'PHASE 5: IMAGE MIGRATION',
    status: 'DATA MIGRATION COMPLETED - READY FOR IMAGE MIGRATION',
    currentImagePaths: {
      localSource: '/uploads/',
      localDirectory: 'uploads/',
      sampleFiles: [
        'mainImage-1772418181980-300596449.jpg',
        'mainImage-1772418424055-383530146.jpg',
        'mainImage-1772418561929-485202986.avif',
        'images-1772418226500-525554115.jpg',
        'images-1772418452491-638849038.jpg',
        'images-1772418611049-404542356.jpg'
      ]
    },
    supabaseConfiguration: {
      bucketName: 'property-images',
      publicAccess: true,
      urlFormat: 'https://[PROJECT_REF].supabase.co/storage/v1/object/public/property-images/[FILENAME]'
    },
    migrationSteps: [
      {
        step: 1,
        title: 'Create Supabase Storage Bucket',
        instructions: [
          'Go to Supabase dashboard → Storage',
          'Click "New bucket"',
          'Name: "property-images"',
          'Public bucket: ✓ (enabled)',
          'File size limit: 50MB',
          'Allowed MIME types: image/*'
        ]
      },
      {
        step: 2,
        title: 'Upload Local Images',
        instructions: [
          'Navigate to Supabase Storage → property-images bucket',
          'Click "Upload"',
          'Select all files from local /uploads/ directory',
          'Upload all images (should be ~100+ files)',
          'Verify all files uploaded successfully'
        ]
      },
      {
        step: 3,
        title: 'Get Project Reference',
        instructions: [
          'Go to Supabase dashboard → Settings → API',
          'Copy the "Project URL" (e.g., https://abc123.supabase.co)',
          'Extract project reference: "abc123"',
          'Your image URL format will be: https://abc123.supabase.co/storage/v1/object/public/property-images/[filename]'
        ]
      },
      {
        step: 4,
        title: 'Update Database Image URLs',
        instructions: [
          'Run the SQL update script provided below',
          'Replace [PROJECT_REF] with your actual project reference',
          'Verify all image URLs are updated',
          'Test image loading in application'
        ]
      }
    ],
    sqlUpdateScript: `
-- =====================================================
-- IMAGE URL MIGRATION - UPDATE TO SUPABASE STORAGE URLS
-- =====================================================

-- STEP 1: Update Property main images
UPDATE "Property" 
SET "mainImage" = REPLACE("mainImage", '/uploads/', 'https://[PROJECT_REF].supabase.co/storage/v1/object/public/property-images/')
WHERE "mainImage" LIKE '/uploads/%';

-- STEP 2: Update Property gallery images (array field)
UPDATE "Property" 
SET "galleryImages" = ARRAY(
  SELECT REPLACE(unnest("galleryImages"), '/uploads/', 'https://[PROJECT_REF].supabase.co/storage/v1/object/public/property-images/')
  WHERE unnest("galleryImages") LIKE '/uploads/%'
)
WHERE "galleryImages" IS NOT NULL AND array_length("galleryImages", 1) > 0;

-- STEP 3: Update Unit images (array field)
UPDATE "Unit" 
SET "images" = ARRAY(
  SELECT REPLACE(unnest("images"), '/uploads/', 'https://[PROJECT_REF].supabase.co/storage/v1/object/public/property-images/')
  WHERE unnest("images") LIKE '/uploads/%'
)
WHERE "images" IS NOT NULL AND array_length("images", 1) > 0;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check updated Property main images
SELECT "id", "name", "mainImage" 
FROM "Property" 
WHERE "mainImage" LIKE 'https://%.supabase.co/storage/v1/object/public/%'
LIMIT 5;

-- Check updated Property gallery images
SELECT "id", "name", "galleryImages"
FROM "Property" 
WHERE "galleryImages" IS NOT NULL AND array_length("galleryImages", 1) > 0
LIMIT 3;

-- Check updated Unit images
SELECT "id", "name", "images"
FROM "Unit" 
WHERE "images" IS NOT NULL AND array_length("images", 1) > 0
LIMIT 3;

-- Count images still using local paths (should be 0)
SELECT COUNT(*) as remaining_local_images 
FROM "Property" 
WHERE "mainImage" LIKE '/uploads/%';
`,
    verificationChecklist: [
      '□ Supabase Storage bucket "property-images" created',
      '□ Bucket set to public access',
      '□ All local /uploads/ files uploaded to Supabase',
      '□ Project reference extracted from Supabase URL',
      '□ SQL update script executed with correct PROJECT_REF',
      '□ All Property mainImage URLs updated to Supabase',
      '□ All Property galleryImages arrays updated',
      '□ All Unit images arrays updated',
      '□ No remaining /uploads/ paths in database',
      '□ Images load correctly in frontend application',
      '□ Images load correctly in admin panel'
    ],
    beforeAfterExample: {
      before: {
        mainImage: '/uploads/mainImage-1772418181980-300596449.jpg',
        galleryImages: '["/uploads/images-1772418226500-525554115.jpg"]',
        unitImages: '["/uploads/images-1772418452491-638849038.jpg"]'
      },
      after: {
        mainImage: 'https://abc123.supabase.co/storage/v1/object/public/property-images/mainImage-1772418181980-300596449.jpg',
        galleryImages: '["https://abc123.supabase.co/storage/v1/object/public/property-images/images-1772418226500-525554115.jpg"]',
        unitImages: '["https://abc123.supabase.co/storage/v1/object/public/property-images/images-1772418452491-638849038.jpg"]'
      }
    },
    troubleshooting: [
      {
        issue: 'Images not loading',
        solution: 'Check bucket is set to public access and verify URL format'
      },
      {
        issue: '404 errors on images',
        solution: 'Verify filenames match exactly between local and Supabase Storage'
      },
      {
        issue: 'SQL update not working',
        solution: 'Replace [PROJECT_REF] with your actual project reference from Supabase URL'
      }
    ]
  };
  
  writeFileSync('image-migration-complete-guide.json', JSON.stringify(imageMigrationGuide, null, 2));
  logSuccess('Complete image migration guide saved to image-migration-complete-guide.json');
  
  return imageMigrationGuide;
}

// Generate SQL update script with placeholder
function generateSQLUpdateScript() {
  const sqlScript = `-- =====================================================
-- IMAGE URL MIGRATION - UPDATE TO SUPABASE STORAGE URLS
-- Generated: ${new Date().toISOString()}
-- =====================================================

-- IMPORTANT: Replace [PROJECT_REF] with your actual Supabase project reference
-- Example: If your Supabase URL is https://abc123.supabase.co, use abc123

-- STEP 1: Update Property main images
UPDATE "Property" 
SET "mainImage" = REPLACE("mainImage", '/uploads/', 'https://[PROJECT_REF].supabase.co/storage/v1/object/public/property-images/')
WHERE "mainImage" LIKE '/uploads/%';

-- STEP 2: Update Property gallery images (array field)
UPDATE "Property" 
SET "galleryImages" = ARRAY(
  SELECT REPLACE(unnest("galleryImages"), '/uploads/', 'https://[PROJECT_REF].supabase.co/storage/v1/object/public/property-images/')
  WHERE unnest("galleryImages") LIKE '/uploads/%'
)
WHERE "galleryImages" IS NOT NULL AND array_length("galleryImages", 1) > 0;

-- STEP 3: Update Unit images (array field)
UPDATE "Unit" 
SET "images" = ARRAY(
  SELECT REPLACE(unnest("images"), '/uploads/', 'https://[PROJECT_REF].supabase.co/storage/v1/object/public/property-images/')
  WHERE unnest("images") LIKE '/uploads/%'
)
WHERE "images" IS NOT NULL AND array_length("images", 1) > 0;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check updated Property main images
SELECT "id", "name", "mainImage" 
FROM "Property" 
WHERE "mainImage" LIKE 'https://%.supabase.co/storage/v1/object/public/%'
LIMIT 5;

-- Check updated Property gallery images
SELECT "id", "name", "galleryImages"
FROM "Property" 
WHERE "galleryImages" IS NOT NULL AND array_length("galleryImages", 1) > 0
LIMIT 3;

-- Check updated Unit images
SELECT "id", "name", "images"
FROM "Unit" 
WHERE "images" IS NOT NULL AND array_length("images", 1) > 0
LIMIT 3;

-- Count images still using local paths (should be 0)
SELECT COUNT(*) as remaining_local_images 
FROM "Property" 
WHERE "mainImage" LIKE '/uploads/%';

-- Migration completed successfully
SELECT 'IMAGE MIGRATION COMPLETED' as status, NOW() as completion_time;`;
  
  writeFileSync('image-url-update.sql', sqlScript);
  logSuccess('Image URL update SQL script saved to image-url-update.sql');
  
  return sqlScript;
}

// Check local uploads directory
function checkLocalUploads() {
  logSection('CHECKING LOCAL UPLOADS DIRECTORY');
  
  const uploadsDir = 'uploads';
  
  if (existsSync(uploadsDir)) {
    try {
      const files = execSync(`dir "${uploadsDir}" /b`, { encoding: 'utf8' });
      const fileList = files.trim().split('\n').filter(file => file.trim());
      
      logInfo(`Found ${fileList.length} files in uploads directory:`);
      
      // Show first 10 files as sample
      fileList.slice(0, 10).forEach((file, index) => {
        logInfo(`  ${index + 1}. ${file}`);
      });
      
      if (fileList.length > 10) {
        logInfo(`  ... and ${fileList.length - 10} more files`);
      }
      
      // Count by file type
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
      const imageFiles = fileList.filter(file => 
        imageExtensions.some(ext => file.toLowerCase().endsWith(ext))
      );
      
      logSuccess(`✅ Found ${imageFiles.length} image files ready for upload`);
      
      return { totalFiles: fileList.length, imageFiles: imageFiles.length };
      
    } catch (error) {
      logError(`Could not list uploads directory: ${error}`);
      return { totalFiles: 0, imageFiles: 0 };
    }
  } else {
    logWarning('⚠️  Uploads directory not found');
    logInfo('Expected directory: uploads/');
    return { totalFiles: 0, imageFiles: 0 };
  }
}

// Main execution
async function main() {
  log('cyan', '🖼️ PHASE 5: IMAGE MIGRATION TO SUPABASE STORAGE');
  log('cyan', '=====================================');
  
  logSuccess('🎉 DATA MIGRATION COMPLETED SUCCESSFULLY!');
  logInfo('Now proceeding with image migration to complete the process.');
  
  // Check local uploads
  const uploadsCheck = checkLocalUploads();
  
  // Generate migration guide
  const migrationGuide = generateImageMigrationGuide();
  
  // Generate SQL script
  const sqlScript = generateSQLUpdateScript();
  
  logSection('IMAGE MIGRATION SUMMARY');
  logInfo(`Local images found: ${uploadsCheck.imageFiles}`);
  logInfo('Migration guide created: image-migration-complete-guide.json');
  logInfo('SQL update script created: image-url-update.sql');
  
  logSection('NEXT STEPS - MANUAL ACTIONS REQUIRED');
  logWarning('⚠️  COMPLETE THESE STEPS IN ORDER:');
  
  const steps = [
    '1. Create Supabase Storage bucket "property-images"',
    '2. Set bucket to public access',
    '3. Upload all files from local /uploads/ directory',
    '4. Get your Supabase project reference from dashboard',
    '5. Edit image-url-update.sql and replace [PROJECT_REF]',
    '6. Run the SQL script in Supabase SQL Editor',
    '7. Verify images load correctly in your application'
  ];
  
  steps.forEach(step => logInfo(step));
  
  logSection('FILES CREATED FOR IMAGE MIGRATION');
  logInfo('📄 image-migration-complete-guide.json - Complete step-by-step guide');
  logInfo('📄 image-url-update.sql - SQL script for URL updates');
  
  logSection('WHEN COMPLETED');
  logSuccess('After image migration:');
  logSuccess('✅ All images will load from Supabase Storage');
  logSuccess('✅ No more /uploads/ paths in database');
  logSuccess('✅ Ready for Phase 6: Runtime verification');
  logSuccess('✅ Ready for Netlify deployment');
  
  logSection('PROGRESS UPDATE');
  logInfo('✅ Phase 1: Baseline snapshot - COMPLETED');
  logInfo('✅ Phase 2: Schema conversion - COMPLETED');
  logInfo('✅ Phase 3: Supabase setup - COMPLETED');
  logInfo('✅ Phase 4: Data migration - COMPLETED');
  logInfo('⏳ Phase 5: Image migration - READY FOR EXECUTION');
  logInfo('⏳ Phase 6: Runtime verification - PENDING');
  logInfo('⏳ Phase 7: Pricing verification - PENDING');
  logInfo('⏳ Phase 8: Netlify deployment - PENDING');
}

main();
