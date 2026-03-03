#!/usr/bin/env node

/**
 * PHASE 1: MIGRATION BASELINE SNAPSHOT
 * 
 * This script freezes the current SQLite state before migration
 * to ensure 1:1 parity verification is possible.
 */

import { PrismaClient } from '@prisma/client';
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

// Create migration baseline snapshot
async function createBaselineSnapshot() {
  logSection('PHASE 1: MIGRATION BASELINE SNAPSHOT');
  
  const prisma = new PrismaClient();
  const snapshot: any = {
    timestamp: new Date().toISOString(),
    database: 'SQLite',
    schema: {},
    data: {},
    samples: {},
    verification: {}
  };
  
  try {
    logInfo('Connecting to SQLite database...');
    await prisma.$connect();
    logSuccess('Database connection established');
    
    // Get database info
    const dbInfo = await prisma.$queryRaw`SELECT name FROM pragma_database_list()` as any[];
    logInfo(`Database: ${dbInfo[0]?.name || 'unknown'}`);
    
    // Get table counts
    logSection('TABLE COUNTS - BASELINE');
    const tableCounts = {
      properties: await prisma.property.count(),
      units: await prisma.unit.count(),
      bookings: await prisma.booking.count(),
      payments: await prisma.payment.count(),
      users: await prisma.user.count(),
      coupons: await prisma.coupon.count(),
      seasonalPricing: await prisma.seasonalPricing.count(),
      amenities: await prisma.amenity.count(),
      dateBlockages: await prisma.dateBlockage.count()
    };
    
    Object.entries(tableCounts).forEach(([table, count]) => {
      logInfo(`${table}: ${count}`);
    });
    
    snapshot.data.counts = tableCounts;
    
    // Export all data as JSON
    logSection('EXPORTING ALL DATA');
    
    const tables = ['Property', 'Unit', 'Booking', 'Payment', 'User', 'Coupon', 'SeasonalPricing', 'Amenity', 'DateBlockage'];
    
    for (const table of tables) {
      const modelName = table.toLowerCase();
      try {
        // @ts-ignore
        const records = await prisma[modelName].findMany();
        snapshot.data[table.toLowerCase()] = records;
        logSuccess(`Exported ${records.length} ${table} records`);
      } catch (error) {
        logError(`Failed to export ${table}: ${error}`);
      }
    }
    
    // Get 3 full property objects as samples
    logSection('PROPERTY SAMPLES - BASELINE');
    const sampleProperties = await prisma.property.findMany({
      take: 3,
      include: {
        units: true,
        amenities: true,
        seasonalPricing: true,
        dateBlockages: true
      }
    });
    
    sampleProperties.forEach((prop, index) => {
      logInfo(`Sample Property ${index + 1}: ${prop.name} (${prop.slug})`);
      logInfo(`  ID: ${prop.id}`);
      logInfo(`  Main Image: ${prop.mainImage}`);
      logInfo(`  Gallery Images: ${prop.galleryImages}`);
      logInfo(`  Units: ${prop.units.length}`);
      logInfo(`  Amenities: ${prop.amenities.length}`);
      logInfo(`  Seasonal Pricing: ${prop.seasonalPricing.length}`);
    });
    
    snapshot.samples.properties = sampleProperties;
    
    // Test pricing calculation sample
    logSection('PRICING CALCULATION - BASELINE');
    const sampleUnit = await prisma.unit.findFirst({
      include: {
        property: true
      }
    });
    
    if (sampleUnit) {
      const pricingSample = {
        unitId: sampleUnit.id,
        unitName: sampleUnit.name,
        basePrice: sampleUnit.basePrice,
        cleaningFee: sampleUnit.cleaningFee,
        propertyName: sampleUnit.property.name,
        calculation: {
          nights: 7,
          basePrice: sampleUnit.basePrice,
          subtotal: sampleUnit.basePrice * 7,
          cleaningFee: sampleUnit.cleaningFee,
          taxes: (sampleUnit.basePrice * 7) * 0.1, // Assuming 10% tax
          totalPrice: (sampleUnit.basePrice * 7) + sampleUnit.cleaningFee + ((sampleUnit.basePrice * 7) * 0.1)
        }
      };
      
      logInfo(`Pricing Sample for ${sampleUnit.name}:`);
      logInfo(`  Base Price: €${sampleUnit.basePrice}`);
      logInfo(`  Cleaning Fee: €${sampleUnit.cleaningFee}`);
      logInfo(`  7 nights subtotal: €${pricingSample.calculation.subtotal}`);
      logInfo(`  Taxes (10%): €${pricingSample.calculation.taxes}`);
      logInfo(`  Total Price: €${pricingSample.calculation.totalPrice}`);
      
      snapshot.samples.pricing = pricingSample;
    }
    
    // Test coupon validation sample
    logSection('COUPON VALIDATION - BASELINE');
    const sampleCoupon = await prisma.coupon.findFirst();
    
    if (sampleCoupon) {
      const couponSample = {
        code: sampleCoupon.code,
        discountType: sampleCoupon.discountType,
        discountValue: sampleCoupon.discountValue,
        validFrom: sampleCoupon.validFrom,
        validUntil: sampleCoupon.validUntil,
        minBookingAmount: sampleCoupon.minBookingAmount,
        usedCount: sampleCoupon.usedCount,
        maxUses: sampleCoupon.maxUses,
        isActive: sampleCoupon.isActive,
        validation: {
          isValid: sampleCoupon.isActive && 
                   new Date() >= sampleCoupon.validFrom && 
                   new Date() <= sampleCoupon.validUntil &&
                   (!sampleCoupon.maxUses || sampleCoupon.usedCount < sampleCoupon.maxUses),
          reason: sampleCoupon.isActive ? 'Active and valid' : 'Inactive or expired'
        }
      };
      
      logInfo(`Coupon Sample: ${sampleCoupon.code}`);
      logInfo(`  Type: ${sampleCoupon.discountType}`);
      logInfo(`  Value: ${sampleCoupon.discountValue}`);
      logInfo(`  Valid: ${couponSample.validation.isValid ? 'YES' : 'NO'}`);
      logInfo(`  Reason: ${couponSample.validation.reason}`);
      
      snapshot.samples.coupon = couponSample;
    } else {
      logInfo('No coupons found in database');
    }
    
    // Test slug routing sample
    logSection('SLUG ROUTING - BASELINE');
    const slugs = {
      properties: await prisma.property.findMany({ select: { id: true, name: true, slug: true } }),
      units: await prisma.unit.findMany({ select: { id: true, name: true, slug: true } })
    };
    
    logInfo(`Property Slugs (${slugs.properties.length}):`);
    slugs.properties.forEach(prop => {
      logInfo(`  ${prop.slug} -> ${prop.name} (${prop.id})`);
    });
    
    logInfo(`Unit Slugs (${slugs.units.length}):`);
    slugs.units.forEach(unit => {
      logInfo(`  ${unit.slug} -> ${unit.name} (${unit.id})`);
    });
    
    snapshot.samples.slugs = slugs;
    
    // Save baseline snapshot
    const snapshotPath = 'migration-baseline-snapshot.json';
    writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
    logSuccess(`Baseline snapshot saved to ${snapshotPath}`);
    
    // Create SQLite dump
    logSection('SQLITE DUMP');
    try {
      if (existsSync('prisma/dev.db')) {
        const sqliteDump = execSync('sqlite3 prisma/dev.db .dump', { encoding: 'utf8' });
        writeFileSync('migration-sqlite-dump.sql', sqliteDump);
        logSuccess('SQLite dump saved to migration-sqlite-dump.sql');
      } else {
        logError('SQLite database file not found at prisma/dev.db');
      }
    } catch (error) {
      logError(`SQLite dump failed: ${error}`);
    }
    
    // Create verification checksum
    logSection('VERIFICATION CHECKSUM');
    const checksum = {
      totalRecords: Object.values(tableCounts).reduce((sum, count) => sum + count, 0),
      properties: tableCounts.properties,
      units: tableCounts.units,
      bookings: tableCounts.bookings,
      coupons: tableCounts.coupons,
      timestamp: snapshot.timestamp
    };
    
    writeFileSync('migration-checksum.json', JSON.stringify(checksum, null, 2));
    logSuccess('Verification checksum saved');
    
    logSection('BASELINE SNAPSHOT COMPLETE');
    logSuccess('Migration baseline snapshot created successfully');
    logInfo('Ready to proceed with Phase 2: Prisma conversion');
    
  } catch (error) {
    logError(`Baseline snapshot failed: ${error}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
async function main() {
  log('cyan', '🔒 MIGRATION BASELINE SNAPSHOT');
  log('cyan', '=====================================');
  
  try {
    await createBaselineSnapshot();
    
    logSection('NEXT STEPS');
    logInfo('1. Review migration-baseline-snapshot.json');
    logInfo('2. Verify all data is exported correctly');
    logInfo('3. Proceed to Phase 2: Prisma conversion');
    
  } catch (error) {
    logError('Baseline snapshot failed. Cannot proceed with migration.');
    process.exit(1);
  }
}

main();
