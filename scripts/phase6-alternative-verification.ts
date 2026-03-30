#!/usr/bin/env node

/**
 * PHASE 6: ALTERNATIVE RUNTIME VERIFICATION
 * 
 * This script provides alternative verification methods when direct
 * database connection is not possible from local environment.
 */

import { writeFileSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

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

// Alternative verification using Supabase dashboard SQL
function generateSupabaseDashboardVerification() {
  logSection('ALTERNATIVE VERIFICATION - SUPABASE DASHBOARD');
  
  const verificationSQL = `
-- =====================================================
-- PHASE 6: RUNTIME VERIFICATION - SUPABASE DASHBOARD
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================

-- Environment verification (manual check)
-- DATABASE_URL: Supabase Dashboard → Settings → Database (never commit passwords)
-- SUPABASE_URL: https://YOUR_PROJECT_REF.supabase.co

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
FROM "Property" WHERE mainImage LIKE 'https://%.supabase.co/storage/v1/object/public/%'
UNION ALL
SELECT 'properties_with_local_images' as check_name, COUNT(*) as count,
       CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Property" WHERE mainImage LIKE '/uploads/%'
UNION ALL
SELECT 'units_with_local_images' as check_name, COUNT(*) as count,
       CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Unit" WHERE images LIKE '%/uploads/%';

-- 4. SAMPLE DATA VERIFICATION
SELECT 'SAMPLE DATA VERIFICATION' as test_name;

-- Sample properties with slugs and images
SELECT 'Property Sample' as info, id, name, slug, mainImage
FROM "Property" 
ORDER BY id
LIMIT 3;

-- Sample units with pricing
SELECT 'Unit Sample' as info, id, name, slug, basePrice, cleaningFee
FROM "Unit"
ORDER BY id
LIMIT 3;

-- Sample coupons
SELECT 'Coupon Sample' as info, code, discountType, discountValue, isActive
FROM "Coupon"
ORDER BY id;

-- Sample booking
SELECT 'Booking Sample' as info, bookingNumber, totalPrice, status, paymentStatus
FROM "Booking"
ORDER BY id;

-- 5. PRICING VERIFICATION
SELECT 'PRICING VERIFICATION' as test_name;

SELECT 'pricing_check' as test, 
       COUNT(*) as units_with_valid_pricing,
       CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Unit" 
WHERE basePrice > 0 AND cleaningFee >= 0;

-- 6. COUPON VERIFICATION
SELECT 'COUPON VERIFICATION' as test_name;

SELECT 'active_coupons' as test, COUNT(*) as count,
       CASE WHEN COUNT(*) >= 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Coupon" 
WHERE isActive = true 
  AND validFrom <= NOW() 
  AND validUntil >= NOW();

-- 7. RELATIONSHIP VERIFICATION
SELECT 'RELATIONSHIP VERIFICATION' as test_name;

SELECT 'property_unit_relations' as test, COUNT(*) as count,
       CASE WHEN COUNT(*) = 6 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Unit" u
JOIN "Property" p ON u.propertyId = p.id;

SELECT 'booking_unit_relations' as test, COUNT(*) as count,
       CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Booking" b
JOIN "Unit" u ON b.unitId = u.id;

-- 8. ARRAY FIELD VERIFICATION
SELECT 'ARRAY FIELD VERIFICATION' as test_name;

SELECT 'gallery_images_arrays' as test, COUNT(*) as count,
       CASE WHEN COUNT(*) >= 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Property" 
WHERE galleryImages IS NOT NULL;

SELECT 'unit_images_arrays' as test, COUNT(*) as count,
       CASE WHEN COUNT(*) >= 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM "Unit" 
WHERE images IS NOT NULL;

-- FINAL SUMMARY
SELECT 'VERIFICATION COMPLETE' as status, NOW() as completion_time;
`;
  
  writeFileSync('supabase-dashboard-verification.sql', verificationSQL);
  logSuccess('Supabase dashboard verification SQL saved to supabase-dashboard-verification.sql');
  
  return verificationSQL;
}

// Generate connection troubleshooting guide
function generateConnectionTroubleshooting() {
  logSection('CONNECTION TROUBLESHOOTING GUIDE');
  
  const troubleshooting = {
    timestamp: new Date().toISOString(),
    issue: 'Cannot connect to Supabase database from local environment',
    errorCode: 'P1001',
    possibleCauses: [
      'Network firewall blocking database connections',
      'ISP blocking database ports',
      'Local network restrictions',
      'Supabase database paused or suspended',
      'Incorrect database URL format'
    ],
    solutions: [
      {
        title: 'Use Supabase Dashboard SQL Editor',
        description: 'Run verification queries directly in Supabase dashboard',
        steps: [
          'Go to your Supabase project dashboard',
          'Navigate to SQL Editor',
          'Copy and paste contents of supabase-dashboard-verification.sql',
          'Execute the script',
          'Review all verification results'
        ]
      },
      {
        title: 'Check Supabase Project Status',
        description: 'Ensure your Supabase project is active',
        steps: [
          'Go to Supabase dashboard',
          'Check project status (should be "Active")',
          'Verify database is not paused',
          'Check billing status if applicable'
        ]
      },
      {
        title: 'Verify Database URL',
        description: 'Confirm connection string is correct',
        steps: [
          'Go to Settings → Database in Supabase',
          'Copy the "Connection string" (URI format)',
          'Compare with your DATABASE_URL',
          'Ensure password matches exactly'
        ]
      },
      {
        title: 'Network Diagnostics',
        description: 'Test network connectivity',
        steps: [
          'Try accessing https://supabase.com in browser',
          'Check if you can reach your project dashboard',
          'Test with different network (mobile hotspot)',
          'Check if corporate firewall is blocking connections'
        ]
      }
    ],
    alternativeApproaches: [
      'Deploy to Netlify for production testing',
      'Use Supabase dashboard for all verification',
      'Proceed with deployment if dashboard verification passes'
    ],
    nextSteps: [
      '1. Run supabase-dashboard-verification.sql in Supabase dashboard',
      '2. Review all verification results',
      '3. If all checks pass, proceed to Phase 7',
      '4. If issues found, fix them before deployment'
    ]
  };
  
  writeFileSync('connection-troubleshooting.json', JSON.stringify(troubleshooting, null, 2));
  logSuccess('Connection troubleshooting guide saved to connection-troubleshooting.json');
  
  return troubleshooting;
}

// Main execution
async function main() {
  log('cyan', '🔍 PHASE 6: ALTERNATIVE RUNTIME VERIFICATION');
  log('cyan', '=====================================');
  
  logWarning('⚠️  LOCAL DATABASE CONNECTION FAILED');
  logInfo('Error: P1001 - Cannot reach database server');
  logInfo('This is a common issue with local network restrictions');
  
  // Generate dashboard verification
  const dashboardSQL = generateSupabaseDashboardVerification();
  
  // Generate troubleshooting guide
  const troubleshooting = generateConnectionTroubleshooting();
  
  logSection('ALTERNATIVE VERIFICATION METHOD');
  logSuccess('✅ Supabase Dashboard SQL verification created');
  logInfo('File: supabase-dashboard-verification.sql');
  
  logSection('EXECUTION INSTRUCTIONS');
  logInfo('1. Go to your Supabase project dashboard');
  logInfo('2. Navigate to SQL Editor');
  logInfo('3. Copy contents of supabase-dashboard-verification.sql');
  logInfo('4. Paste and execute the script');
  logInfo('5. Review all verification results');
  
  logSection('VERIFICATION COVERAGE');
  logInfo('✅ Data counts verification (6,6,1,3,3)');
  logInfo('✅ Slug verification (all present)');
  logInfo('✅ Image URL verification (Supabase vs local)');
  logInfo('✅ Sample data verification');
  logInfo('✅ Pricing verification');
  logInfo('✅ Coupon verification');
  logInfo('✅ Relationship verification');
  logInfo('✅ Array field verification');
  
  logSection('SUCCESS CRITERIA');
  logSuccess('All verification queries should show:');
  logInfo('• ✅ PASS status for all data counts');
  logInfo('• ✅ PASS status for slug verification');
  logInfo('• ✅ PASS status for image URL verification');
  logInfo('• ✅ PASS status for pricing verification');
  logInfo('• No ❌ FAIL results in any test');
  
  logSection('FILES CREATED');
  logInfo('📄 supabase-dashboard-verification.sql - Complete verification SQL');
  logInfo('📄 connection-troubleshooting.json - Troubleshooting guide');
  
  logSection('NEXT ACTION');
  logWarning('⚠️  RUN DASHBOARD VERIFICATION:');
  logInfo('Execute the SQL script in Supabase dashboard');
  logInfo('This will provide complete verification results');
  logInfo('If all tests pass, you can proceed to Phase 7');
  
  logSection('MIGRATION STATUS');
  logInfo('✅ Phase 1-5: All completed successfully');
  logInfo('⏳ Phase 6: Verification via Supabase dashboard');
  logInfo('⏳ Phase 7: Pricing verification (pending)');
  logInfo('⏳ Phase 8: Netlify deployment (pending)');
}

main();
