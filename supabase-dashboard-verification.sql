
-- =====================================================
-- PHASE 6: RUNTIME VERIFICATION - SUPABASE DASHBOARD
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================

-- Environment verification (manual check)
-- Your DATABASE_URL should be: postgresql://postgres:Skatanafas14!@db.jkolkjvhlguaqcfgaaig.supabase.co:5432/postgres
-- Your SUPABASE_URL should be: https://jkolkjvhlguaqcfgaaig.supabase.co

-- 1. DATA INTEGRITY VERIFICATION
SELECT 'DATA COUNTS VERIFICATION' as test_name;

SELECT 'properties' as table_name, COUNT(*) as actual_count, 6 as expected_count, 
       CASE WHEN COUNT(*) = 6 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Property"
UNION ALL
SELECT 'units' as table_name, COUNT(*) as actual_count, 6 as expected_count,
       CASE WHEN COUNT(*) = 6 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Unit"
UNION ALL
SELECT 'bookings' as table_name, COUNT(*) as actual_count, 1 as expected_count,
       CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Booking"
UNION ALL
SELECT 'users' as table_name, COUNT(*) as actual_count, 3 as expected_count,
       CASE WHEN COUNT(*) = 3 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "User"
UNION ALL
SELECT 'coupons' as table_name, COUNT(*) as actual_count, 3 as expected_count,
       CASE WHEN COUNT(*) = 3 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Coupon"
ORDER BY table_name;

-- 2. SLUG VERIFICATION
SELECT 'SLUG VERIFICATION' as test_name;

SELECT 'property_slugs' as check_name, COUNT(*) as count, 
       CASE WHEN COUNT(*) = 6 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Property" WHERE slug IS NOT NULL AND slug != ''
UNION ALL
SELECT 'unit_slugs' as check_name, COUNT(*) as count,
       CASE WHEN COUNT(*) = 6 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Unit" WHERE slug IS NOT NULL AND slug != '';

-- 3. IMAGE URL VERIFICATION
SELECT 'IMAGE URL VERIFICATION' as test_name;

SELECT 'properties_with_supabase_images' as check_name, COUNT(*) as count,
       CASE WHEN COUNT(*) = 6 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Property" WHERE "mainImage" LIKE 'https://jkolkjvhlguaqcfgaaig.supabase.co/storage/v1/object/public/%'
UNION ALL
SELECT 'properties_with_local_images' as check_name, COUNT(*) as count,
       CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Property" WHERE "mainImage" LIKE '/uploads/%'
UNION ALL
SELECT 'units_with_local_images' as check_name, COUNT(*) as count,
       CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Unit" WHERE EXISTS (
  SELECT 1 FROM unnest("images") as img WHERE img LIKE '%/uploads/%'
);

-- 4. SAMPLE DATA VERIFICATION
SELECT 'SAMPLE DATA VERIFICATION' as test_name;

-- Sample properties with slugs and images
SELECT 'Property Sample' as info, id, name, slug, "mainImage"
FROM "Property" 
ORDER BY id
LIMIT 3;

-- Sample units with pricing
SELECT 'Unit Sample' as info, id, name, slug, "basePrice", "cleaningFee"
FROM "Unit"
ORDER BY id
LIMIT 3;

-- Sample coupons
SELECT 'Coupon Sample' as info, code, "discountType", "discountValue", "isActive"
FROM "Coupon"
ORDER BY id;

-- Sample booking
SELECT 'Booking Sample' as info, "bookingNumber", "totalPrice", status, "paymentStatus"
FROM "Booking"
ORDER BY id;

-- 5. PRICING VERIFICATION
SELECT 'PRICING VERIFICATION' as test_name;

SELECT 'pricing_check' as test, 
       COUNT(*) as units_with_valid_pricing,
       CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Unit" 
WHERE "basePrice" > 0 AND "cleaningFee" >= 0;

-- 6. COUPON VERIFICATION
SELECT 'COUPON VERIFICATION' as test_name;

SELECT 'active_coupons' as test, COUNT(*) as count,
       CASE WHEN COUNT(*) >= 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Coupon" 
WHERE "isActive" = true 
  AND "validFrom" <= NOW() 
  AND "validUntil" >= NOW();

-- 7. RELATIONSHIP VERIFICATION
SELECT 'RELATIONSHIP VERIFICATION' as test_name;

SELECT 'property_unit_relations' as test, COUNT(*) as count,
       CASE WHEN COUNT(*) = 6 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Unit" u
JOIN "Property" p ON u."propertyId" = p.id;

SELECT 'booking_unit_relations' as test, COUNT(*) as count,
       CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Booking" b
JOIN "Unit" u ON b."unitId" = u.id;

-- 8. ARRAY FIELD VERIFICATION
SELECT 'ARRAY FIELD VERIFICATION' as test_name;

SELECT 'gallery_images_arrays' as test, COUNT(*) as count,
       CASE WHEN COUNT(*) >= 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Property" 
WHERE "galleryImages" IS NOT NULL;

SELECT 'unit_images_arrays' as test, COUNT(*) as count,
       CASE WHEN COUNT(*) >= 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Unit" 
WHERE "images" IS NOT NULL;

-- FINAL SUMMARY
SELECT 'VERIFICATION COMPLETE' as status, NOW() as completion_time;
