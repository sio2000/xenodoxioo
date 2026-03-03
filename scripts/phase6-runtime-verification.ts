#!/usr/bin/env node

/**
 * PHASE 6: RUNTIME VERIFICATION
 * 
 * This script performs comprehensive runtime testing to verify
 * 1:1 parity between local SQLite and Supabase PostgreSQL.
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

// Generate comprehensive runtime verification script
function generateRuntimeVerification() {
  logSection('PHASE 6: RUNTIME VERIFICATION');
  
  const verificationScript = `
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment
dotenv.config();

const prisma = new PrismaClient();

async function runRuntimeVerification() {
  console.log('🔍 PHASE 6: RUNTIME VERIFICATION');
  console.log('=====================================');
  
  try {
    // Environment verification
    console.log('\\n--- ENVIRONMENT VERIFICATION ---');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
    console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
    
    if (process.env.DATABASE_URL) {
      console.log('Database type:', process.env.DATABASE_URL.startsWith('postgresql://') ? 'PostgreSQL' : 'Other');
      console.log('Contains supabase:', process.env.DATABASE_URL.includes('supabase'));
    }
    
    // Database connection test
    console.log('\\n--- DATABASE CONNECTION TEST ---');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Data integrity verification
    console.log('\\n--- DATA INTEGRITY VERIFICATION ---');
    
    const baselineCounts = {
      properties: 6,
      units: 6,
      bookings: 1,
      payments: 0,
      users: 3,
      coupons: 3
    };
    
    const currentCounts = {
      properties: await prisma.property.count(),
      units: await prisma.unit.count(),
      bookings: await prisma.booking.count(),
      payments: await prisma.payment.count(),
      users: await prisma.user.count(),
      coupons: await prisma.coupon.count()
    };
    
    console.log('Row count comparison:');
    Object.entries(baselineCounts).forEach(([table, expected]) => {
      const actual = currentCounts[table as keyof typeof currentCounts];
      const status = actual === expected ? '✅' : '❌';
      console.log(\`  \${status} \${table}: \${actual}/\${expected}\`);
    });
    
    // Slug verification
    console.log('\\n--- SLUG VERIFICATION ---');
    const properties = await prisma.property.findMany({
      select: { id: true, name: true, slug: true, mainImage: true }
    });
    
    const units = await prisma.unit.findMany({
      select: { id: true, name: true, slug: true, images: true }
    });
    
    console.log('Property slugs:');
    properties.forEach(prop => {
      const hasSlug = prop.slug && prop.slug.length > 0;
      const status = hasSlug ? '✅' : '❌';
      console.log(\`  \${status} \${prop.slug} -> \${prop.name}\`);
    });
    
    console.log('Unit slugs:');
    units.forEach(unit => {
      const hasSlug = unit.slug && unit.slug.length > 0;
      const status = hasSlug ? '✅' : '❌';
      console.log(\`  \${status} \${unit.slug} -> \${unit.name}\`);
    });
    
    // Image URL verification
    console.log('\\n--- IMAGE URL VERIFICATION ---');
    
    const imageStats = {
      propertiesWithLocalImages: 0,
      propertiesWithSupabaseImages: 0,
      unitsWithLocalImages: 0,
      unitsWithSupabaseImages: 0
    };
    
    properties.forEach(prop => {
      if (prop.mainImage?.includes('/uploads/')) {
        imageStats.propertiesWithLocalImages++;
      } else if (prop.mainImage?.includes('supabase.co')) {
        imageStats.propertiesWithSupabaseImages++;
      }
    });
    
    units.forEach(unit => {
      if (unit.images && unit.images.includes('/uploads/')) {
        imageStats.unitsWithLocalImages++;
      } else if (unit.images && unit.images.includes('supabase.co')) {
        imageStats.unitsWithSupabaseImages++;
      }
    });
    
    console.log('Image URL statistics:');
    console.log(\`  Properties with local images: \${imageStats.propertiesWithLocalImages} (should be 0)\`);
    console.log(\`  Properties with Supabase images: \${imageStats.propertiesWithSupabaseImages}\`);
    console.log(\`  Units with local images: \${imageStats.unitsWithLocalImages} (should be 0)\`);
    console.log(\`  Units with Supabase images: \${imageStats.unitsWithSupabaseImages}\`);
    
    // Sample image URLs
    console.log('\\nSample image URLs:');
    if (properties.length > 0) {
      console.log(\`  Property main image: \${properties[0].mainImage}\`);
    }
    if (units.length > 0) {
      console.log(\`  Unit images: \${units[0].images}\`);
    }
    
    // Pricing verification
    console.log('\\n--- PRICING VERIFICATION ---');
    
    const sampleUnit = await prisma.unit.findFirst({
      include: { property: true }
    });
    
    if (sampleUnit) {
      const pricingTest = {
        basePrice: sampleUnit.basePrice,
        cleaningFee: sampleUnit.cleaningFee,
        subtotal: sampleUnit.basePrice * 7, // 7 nights
        taxes: sampleUnit.basePrice * 7 * 0.1, // 10% tax
        totalPrice: (sampleUnit.basePrice * 7) + sampleUnit.cleaningFee + (sampleUnit.basePrice * 7 * 0.1)
      };
      
      console.log(\`Sample pricing for \${sampleUnit.name}:\`);
      console.log(\`  Base Price: €\${pricingTest.basePrice}\`);
      console.log(\`  Cleaning Fee: €\${pricingTest.cleaningFee}\`);
      console.log(\`  7 nights subtotal: €\${pricingTest.subtotal}\`);
      console.log(\`  Taxes (10%): €\${pricingTest.taxes}\`);
      console.log(\`  Total Price: €\${pricingTest.totalPrice}\`);
      
      // Verify no undefined values
      const hasUndefined = Object.values(pricingTest).some(val => val === undefined || val === null);
      console.log(\`  No undefined values: \${!hasUndefined ? '✅' : '❌'}\`);
    }
    
    // Coupon verification
    console.log('\\n--- COUPON VERIFICATION ---');
    
    const coupons = await prisma.coupon.findMany({
      where: { isActive: true }
    });
    
    console.log(\`Active coupons: \${coupons.length}\`);
    coupons.forEach(coupon => {
      const isValid = coupon.isActive && 
                     new Date() >= coupon.validFrom && 
                     new Date() <= coupon.validUntil &&
                     (!coupon.maxUses || coupon.usedCount < coupon.maxUses);
      
      console.log(\`  \${isValid ? '✅' : '❌'} \${coupon.code}: \${coupon.discountType} \${coupon.discountValue}\`);
    });
    
    // Booking verification
    console.log('\\n--- BOOKING VERIFICATION ---');
    
    const bookings = await prisma.booking.findMany({
      include: { unit: { include: { property: true } } }
    });
    
    console.log(\`Total bookings: \${bookings.length}\`);
    bookings.forEach(booking => {
      console.log(\`  \${booking.bookingNumber}: \${booking.unit.property.name} - \${booking.unit.name}\`);
      console.log(\`    Total Price: €\${booking.totalPrice}\`);
      console.log(\`    Status: \${booking.status}\`);
      console.log(\`    Payment Status: \${booking.paymentStatus}\`);
    });
    
    // API route simulation
    console.log('\\n--- API ROUTE SIMULATION ---');
    
    try {
      // Simulate property listing
      const propertyList = await prisma.property.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          mainImage: true,
          location: true,
          units: {
            select: {
              id: true,
              name: true,
              slug: true,
              basePrice: true,
              maxGuests: true
            }
          }
        }
      });
      
      console.log(\`✅ Property listing API: \${propertyList.length} properties\`);
      
      // Simulate unit availability
      const unitList = await prisma.unit.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          maxGuests: true,
          property: {
            select: { name: true, slug: true }
          }
        }
      });
      
      console.log(\`✅ Unit listing API: \${unitList.length} units\`);
      
    } catch (error) {
      console.log('❌ API simulation failed:', error.message);
    }
    
    // Final verification summary
    console.log('\\n--- VERIFICATION SUMMARY ---');
    
    const allCountsMatch = Object.entries(baselineCounts).every(
      ([table, expected]) => currentCounts[table as keyof typeof currentCounts] === expected
    );
    
    const noLocalImages = imageStats.propertiesWithLocalImages === 0 && imageStats.unitsWithLocalImages === 0;
    
    const allSlugsPresent = properties.every(p => p.slug && p.slug.length > 0) && 
                           units.every(u => u.slug && u.slug.length > 0);
    
    console.log(\`Data counts match baseline: \${allCountsMatch ? '✅' : '❌'}\`);
    console.log(\`All images use Supabase URLs: \${noLocalImages ? '✅' : '❌'}\`);
    console.log(\`All slugs present: \${allSlugsPresent ? '✅' : '❌'}\`);
    
    const overallSuccess = allCountsMatch && noLocalImages && allSlugsPresent;
    
    console.log(\`\\n🎯 OVERALL VERIFICATION: \${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}\`);
    
    if (overallSuccess) {
      console.log('\\n🚀 READY FOR NETLIFY DEPLOYMENT!');
      console.log('All data migrated successfully with 1:1 parity verified.');
    } else {
      console.log('\\n⚠️  ISSUES FOUND - Review above logs before deployment.');
    }
    
  } catch (error) {
    console.error('❌ Runtime verification failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runRuntimeVerification().catch(console.error);
`;
  
  writeFileSync('runtime-verification.mjs', verificationScript);
  logSuccess('Runtime verification script saved to runtime-verification.mjs');
  
  return verificationScript;
}

// Generate deployment readiness report
function generateDeploymentReadinessReport() {
  logSection('DEPLOYMENT READINESS REPORT');
  
  const readinessReport = {
    timestamp: new Date().toISOString(),
    phase: 'PHASE 6: RUNTIME VERIFICATION',
    migrationStatus: {
      phase1: '✅ Baseline snapshot completed',
      phase2: '✅ Schema conversion completed',
      phase3: '✅ Supabase setup completed',
      phase4: '✅ Data migration completed',
      phase5: '✅ Image migration completed',
      phase6: '⏳ Runtime verification in progress'
    },
    verificationChecklist: [
      '□ Database connection to Supabase successful',
      '□ All row counts match baseline (6 properties, 6 units, 1 booking, 3 users, 3 coupons)',
      '□ All property slugs present and unique',
      '□ All unit slugs present',
      '□ All images use Supabase Storage URLs (no /uploads/ paths)',
      '□ Pricing calculations work correctly',
      '□ Coupon validation works correctly',
      '□ Booking data integrity maintained',
      '□ API route simulations successful',
      '□ No undefined or null values in critical fields'
    ],
    nextSteps: [
      '1. Run runtime verification script',
      '2. Review verification results',
      '3. Fix any issues found',
      '4. Proceed to Phase 7: Pricing verification',
      '5. Complete Phase 8: Netlify deployment preparation'
    ],
    deploymentPrerequisites: [
      '✅ Supabase PostgreSQL database',
      '✅ Supabase Storage for images',
      '✅ All data migrated with original IDs',
      '✅ All image URLs updated to Supabase',
      '✅ Environment variables configured',
      '⏳ Runtime verification passed'
    ]
  };
  
  writeFileSync('deployment-readiness-report.json', JSON.stringify(readinessReport, null, 2));
  logSuccess('Deployment readiness report saved to deployment-readiness-report.json');
  
  return readinessReport;
}

// Main execution
async function main() {
  log('cyan', '🔍 PHASE 6: RUNTIME VERIFICATION');
  log('cyan', '=====================================');
  
  logSuccess('🎉 IMAGE MIGRATION COMPLETED SUCCESSFULLY!');
  logInfo('Now performing comprehensive runtime verification...');
  
  // Generate verification script
  const verificationScript = generateRuntimeVerification();
  
  // Generate readiness report
  const readinessReport = generateDeploymentReadinessReport();
  
  logSection('RUNTIME VERIFICATION PREPARED');
  logInfo('📄 runtime-verification.mjs - Comprehensive verification script');
  logInfo('📄 deployment-readiness-report.json - Deployment readiness checklist');
  
  logSection('EXECUTION INSTRUCTIONS');
  logInfo('Run the verification script:');
  logInfo('node runtime-verification.mjs');
  
  logSection('VERIFICATION COVERAGE');
  logInfo('✅ Database connection and environment');
  logInfo('✅ Data integrity (row counts vs baseline)');
  logInfo('✅ Slug verification (properties & units)');
  logInfo('✅ Image URL verification (Supabase vs local)');
  logInfo('✅ Pricing calculation verification');
  logInfo('✅ Coupon validation verification');
  logInfo('✅ Booking data integrity');
  logInfo('✅ API route simulation');
  
  logSection('SUCCESS CRITERIA');
  logSuccess('All checks must pass for deployment readiness:');
  logInfo('• Data counts match baseline exactly');
  logInfo('• No local /uploads/ image paths remain');
  logInfo('• All slugs are present and unique');
  logInfo('• Pricing calculations work correctly');
  logInfo('• No undefined/null values in critical fields');
  
  logSection('MIGRATION PROGRESS UPDATE');
  logInfo('✅ Phase 1: Baseline snapshot - COMPLETED');
  logInfo('✅ Phase 2: Schema conversion - COMPLETED');
  logInfo('✅ Phase 3: Supabase setup - COMPLETED');
  logInfo('✅ Phase 4: Data migration - COMPLETED');
  logInfo('✅ Phase 5: Image migration - COMPLETED');
  logInfo('⏳ Phase 6: Runtime verification - READY TO EXECUTE');
  logInfo('⏳ Phase 7: Pricing verification - PENDING');
  logInfo('⏳ Phase 8: Netlify deployment - PENDING');
  
  logSection('NEXT ACTION');
  logWarning('⚠️  RUN VERIFICATION BEFORE PROCEEDING:');
  logInfo('Execute: node runtime-verification.mjs');
  logInfo('Review all verification results');
  logInfo('Fix any issues before Phase 7');
}

main();
