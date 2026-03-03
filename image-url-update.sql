-- =====================================================
-- IMAGE URL MIGRATION - UPDATE TO SUPABASE STORAGE URLS
-- Generated: 2026-03-03T03:59:16.710Z
-- =====================================================

-- IMPORTANT: Replace [PROJECT_REF] with your actual Supabase project reference
-- Example: If your Supabase URL is https://abc123.supabase.co, use abc123
-- PROJECT REFERENCE: jkolkjvhlguaqcfgaaig

-- STEP 1: Update Property main images
UPDATE "Property" 
SET "mainImage" = REPLACE("mainImage", '/uploads/', 'https://jkolkjvhlguaqcfgaaig.supabase.co/storage/v1/object/public/property-images/')
WHERE "mainImage" LIKE '/uploads/%';

-- STEP 2: Update Property gallery images (array field)
UPDATE "Property" 
SET "galleryImages" = ARRAY(
  SELECT REPLACE(elem, '/uploads/', 'https://jkolkjvhlguaqcfgaaig.supabase.co/storage/v1/object/public/property-images/')
  FROM unnest("galleryImages") AS elem
  WHERE elem LIKE '/uploads/%'
)
WHERE "galleryImages" IS NOT NULL AND array_length("galleryImages", 1) > 0;

-- STEP 3: Update Unit images (array field)
UPDATE "Unit" 
SET "images" = ARRAY(
  SELECT REPLACE(elem, '/uploads/', 'https://jkolkjvhlguaqcfgaaig.supabase.co/storage/v1/object/public/property-images/')
  FROM unnest("images") AS elem
  WHERE elem LIKE '/uploads/%'
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
SELECT 'IMAGE MIGRATION COMPLETED' as status, NOW() as completion_time;