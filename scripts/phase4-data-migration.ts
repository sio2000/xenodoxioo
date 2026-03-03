#!/usr/bin/env node

/**
 * PHASE 4: DATA MIGRATION TO SUPABASE
 * 
 * This script generates complete SQL migration scripts and handles
 * data transfer from SQLite to Supabase PostgreSQL with 1:1 parity.
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

// Generate complete SQL migration script
function generateSQLMigration() {
  logSection('GENERATING SQL MIGRATION SCRIPTS');
  
  try {
    // Read baseline data
    const baseline = JSON.parse(readFileSync('migration-baseline-snapshot.json', 'utf8'));
    
    logInfo('Loading baseline data for SQL generation...');
    
    // Generate table creation SQL
    const tableCreationSQL = generateTableCreationSQL();
    
    // Generate data insertion SQL
    const dataInsertionSQL = generateDataInsertionSQL(baseline);
    
    // Combine into complete migration script
    const completeMigration = `
-- =====================================================
-- LEONIDION HOUSES - SQLITE TO SUPABASE MIGRATION
-- Generated: ${new Date().toISOString()}
-- Baseline: ${baseline.timestamp}
-- =====================================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS "AdminLog" CASCADE;
DROP TABLE IF EXISTS "Review" CASCADE;
DROP TABLE IF EXISTS "Payment" CASCADE;
DROP TABLE IF EXISTS "Booking" CASCADE;
DROP TABLE IF EXISTS "PasswordReset" CASCADE;
DROP TABLE IF EXISTS "Session" CASCADE;
DROP TABLE IF EXISTS "DateBlockage" CASCADE;
DROP TABLE IF EXISTS "SeasonalPricing" CASCADE;
DROP TABLE IF EXISTS "Amenity" CASCADE;
DROP TABLE IF EXISTS "Unit" CASCADE;
DROP TABLE IF EXISTS "Property" CASCADE;
DROP TABLE IF EXISTS "Coupon" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- =====================================================
-- TABLE CREATION
-- =====================================================

${tableCreationSQL}

-- =====================================================
-- DATA INSERTION
-- =====================================================

${dataInsertionSQL}

-- =====================================================
-- POST-MIGRATION VERIFICATION
-- =====================================================

-- Verify row counts
SELECT 'User' as table_name, COUNT(*) as row_count FROM "User"
UNION ALL
SELECT 'Property', COUNT(*) FROM "Property"
UNION ALL
SELECT 'Unit', COUNT(*) FROM "Unit"
UNION ALL
SELECT 'Booking', COUNT(*) FROM "Booking"
UNION ALL
SELECT 'Payment', COUNT(*) FROM "Payment"
UNION ALL
SELECT 'Coupon', COUNT(*) FROM "Coupon"
UNION ALL
SELECT 'SeasonalPricing', COUNT(*) FROM "SeasonalPricing"
UNION ALL
SELECT 'Amenity', COUNT(*) FROM "Amenity"
UNION ALL
SELECT 'DateBlockage', COUNT(*) FROM "DateBlockage"
UNION ALL
SELECT 'AdminLog', COUNT(*) FROM "AdminLog"
ORDER BY table_name;

-- Verify critical data integrity
SELECT 'Properties with slugs' as check_name, COUNT(*) as count FROM "Property" WHERE slug IS NOT NULL AND slug != ''
UNION ALL
SELECT 'Units with slugs', COUNT(*) FROM "Unit" WHERE slug IS NOT NULL AND slug != ''
UNION ALL
SELECT 'Properties with main images', COUNT(*) FROM "Property" WHERE mainImage IS NOT NULL AND mainImage != ''
UNION ALL
SELECT 'Active coupons', COUNT(*) FROM "Coupon" WHERE isActive = true
UNION ALL
SELECT 'Bookings with prices', COUNT(*) FROM "Booking" WHERE totalPrice > 0;

-- Migration completed successfully
SELECT 'MIGRATION COMPLETED' as status, NOW() as completion_time;
`;
    
    // Write complete migration script
    writeFileSync('supabase-migration-complete.sql', completeMigration);
    logSuccess('Complete migration script saved to supabase-migration-complete.sql');
    
    // Write separate scripts for easier execution
    writeFileSync('01-table-creation.sql', tableCreationSQL);
    writeFileSync('02-data-insertion.sql', dataInsertionSQL);
    logSuccess('Individual migration scripts saved');
    
    return true;
    
  } catch (error) {
    logError(`SQL generation failed: ${error}`);
    return false;
  }
}

// Generate table creation SQL
function generateTableCreationSQL() {
  return `-- Create User table
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Create unique index on User email
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Create Property table
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "mainImage" TEXT NOT NULL,
    "galleryImages" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- Create unique index on Property slug
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");

-- Create Unit table
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "maxGuests" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "beds" INTEGER NOT NULL,
    "basePrice" FLOAT NOT NULL,
    "cleaningFee" FLOAT NOT NULL DEFAULT 0,
    "images" TEXT[],
    "minStayDays" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraint for Unit
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Booking table
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "userId" TEXT,
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "checkOutDate" TIMESTAMP(3) NOT NULL,
    "nights" INTEGER NOT NULL,
    "basePrice" FLOAT NOT NULL,
    "totalNights" INTEGER NOT NULL,
    "subtotal" FLOAT NOT NULL,
    "cleaningFee" FLOAT NOT NULL DEFAULT 0,
    "taxes" FLOAT NOT NULL DEFAULT 0,
    "discountAmount" FLOAT NOT NULL DEFAULT 0,
    "depositAmount" FLOAT NOT NULL DEFAULT 0,
    "balanceAmount" FLOAT NOT NULL DEFAULT 0,
    "totalPrice" FLOAT NOT NULL,
    "guests" INTEGER NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT,
    "totalPaid" FLOAT NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "depositPaid" BOOLEAN NOT NULL DEFAULT false,
    "balancePaid" BOOLEAN NOT NULL DEFAULT false,
    "balanceChargeDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stripeCustomerId" TEXT,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- Create unique index on Booking bookingNumber
CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON "Booking"("bookingNumber");

-- Create foreign key constraints for Booking
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create Payment table
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" FLOAT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paymentType" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "stripeCustomerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "description" TEXT,
    "isRefundable" BOOLEAN NOT NULL DEFAULT true,
    "refundAmount" FLOAT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraints for Payment
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Coupon table
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" FLOAT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "minBookingAmount" FLOAT,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- Create unique index on Coupon code
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- Create SeasonalPricing table
CREATE TABLE "SeasonalPricing" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "pricePerNight" FLOAT NOT NULL,
    "minStayDays" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonalPricing_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraint for SeasonalPricing
ALTER TABLE "SeasonalPricing" ADD CONSTRAINT "SeasonalPricing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Amenity table
CREATE TABLE "Amenity" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraint for Amenity
ALTER TABLE "Amenity" ADD CONSTRAINT "Amenity_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create DateBlockage table
CREATE TABLE "DateBlockage" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DateBlockage_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraint for DateBlockage
ALTER TABLE "DateBlockage" ADD CONSTRAINT "DateBlockage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Session table
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes for Session
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- Create foreign key constraint for Session
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create PasswordReset table
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- Create unique index on PasswordReset token
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- Create foreign key constraint for PasswordReset
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Review table
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraints for Review
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create AdminLog table
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT,
    "changes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraint for AdminLog
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`;
}

// Generate data insertion SQL
function generateDataInsertionSQL(baseline: any) {
  let sql = '';
  
  // Helper function to escape SQL strings
  const escapeSQL = (str: string | null | undefined): string => {
    if (str === null || str === undefined) return 'NULL';
    return `'${str.toString().replace(/'/g, "''")}'`;
  };
  
  // Helper function to format timestamp
  const formatTimestamp = (date: string | null | undefined): string => {
    if (!date) return 'NULL';
    return `'${date}'`;
  };
  
  // Helper function to format array
  const formatArray = (arr: string | null | undefined): string => {
    if (!arr || arr === '[]' || arr === '') return "'{}'";
    try {
      const parsed = JSON.parse(arr);
      if (Array.isArray(parsed) && parsed.length === 0) return "'{}'";
      return `ARRAY[${parsed.map(item => escapeSQL(item)).join(', ')}]`;
    } catch {
      return "'{}'";
    }
  };
  
  // Insert Users
  if (baseline.data.user && baseline.data.user.length > 0) {
    sql += '-- Insert Users\n';
    baseline.data.user.forEach((user: any) => {
      sql += `INSERT INTO "User" ("id", "email", "firstName", "lastName", "password", "role", "status", "isEmailVerified", "emailVerificationToken", "passwordResetToken", "passwordResetExpires", "lastLoginAt", "createdAt", "updatedAt") VALUES (${escapeSQL(user.id)}, ${escapeSQL(user.email)}, ${escapeSQL(user.firstName)}, ${escapeSQL(user.lastName)}, ${escapeSQL(user.password)}, ${escapeSQL(user.role)}, ${escapeSQL(user.status)}, ${user.isEmailVerified}, ${escapeSQL(user.emailVerificationToken)}, ${escapeSQL(user.passwordResetToken)}, ${formatTimestamp(user.passwordResetExpires)}, ${formatTimestamp(user.lastLoginAt)}, ${formatTimestamp(user.createdAt)}, ${formatTimestamp(user.updatedAt)});\n`;
    });
    sql += '\n';
  }
  
  // Insert Properties
  if (baseline.data.property && baseline.data.property.length > 0) {
    sql += '-- Insert Properties\n';
    baseline.data.property.forEach((property: any) => {
      sql += `INSERT INTO "Property" ("id", "name", "description", "location", "city", "country", "slug", "mainImage", "galleryImages", "isActive", "createdAt", "updatedAt") VALUES (${escapeSQL(property.id)}, ${escapeSQL(property.name)}, ${escapeSQL(property.description)}, ${escapeSQL(property.location)}, ${escapeSQL(property.city)}, ${escapeSQL(property.country)}, ${escapeSQL(property.slug)}, ${escapeSQL(property.mainImage)}, ${formatArray(property.galleryImages)}, ${property.isActive}, ${formatTimestamp(property.createdAt)}, ${formatTimestamp(property.updatedAt)});\n`;
    });
    sql += '\n';
  }
  
  // Insert Units
  if (baseline.data.unit && baseline.data.unit.length > 0) {
    sql += '-- Insert Units\n';
    baseline.data.unit.forEach((unit: any) => {
      sql += `INSERT INTO "Unit" ("id", "propertyId", "name", "slug", "description", "maxGuests", "bedrooms", "bathrooms", "beds", "basePrice", "cleaningFee", "images", "minStayDays", "isActive", "createdAt", "updatedAt") VALUES (${escapeSQL(unit.id)}, ${escapeSQL(unit.propertyId)}, ${escapeSQL(unit.name)}, ${escapeSQL(unit.slug)}, ${escapeSQL(unit.description)}, ${unit.maxGuests}, ${unit.bedrooms}, ${unit.bathrooms}, ${unit.beds}, ${unit.basePrice}, ${unit.cleaningFee}, ${formatArray(unit.images)}, ${unit.minStayDays}, ${unit.isActive}, ${formatTimestamp(unit.createdAt)}, ${formatTimestamp(unit.updatedAt)});\n`;
    });
    sql += '\n';
  }
  
  // Insert Coupons
  if (baseline.data.coupon && baseline.data.coupon.length > 0) {
    sql += '-- Insert Coupons\n';
    baseline.data.coupon.forEach((coupon: any) => {
      sql += `INSERT INTO "Coupon" ("id", "code", "description", "discountType", "discountValue", "validFrom", "validUntil", "minBookingAmount", "maxUses", "usedCount", "isActive", "createdAt", "updatedAt") VALUES (${escapeSQL(coupon.id)}, ${escapeSQL(coupon.code)}, ${escapeSQL(coupon.description)}, ${escapeSQL(coupon.discountType)}, ${coupon.discountValue}, ${formatTimestamp(coupon.validFrom)}, ${formatTimestamp(coupon.validUntil)}, ${coupon.minBookingAmount}, ${coupon.maxUses}, ${coupon.usedCount}, ${coupon.isActive}, ${formatTimestamp(coupon.createdAt)}, ${formatTimestamp(coupon.updatedAt)});\n`;
    });
    sql += '\n';
  }
  
  // Insert Bookings
  if (baseline.data.booking && baseline.data.booking.length > 0) {
    sql += '-- Insert Bookings\n';
    baseline.data.booking.forEach((booking: any) => {
      sql += `INSERT INTO "Booking" ("id", "bookingNumber", "unitId", "userId", "checkInDate", "checkOutDate", "nights", "basePrice", "totalNights", "subtotal", "cleaningFee", "taxes", "discountAmount", "depositAmount", "balanceAmount", "totalPrice", "guests", "guestName", "guestEmail", "guestPhone", "totalPaid", "paymentStatus", "depositPaid", "balancePaid", "balanceChargeDate", "status", "stripeCustomerId", "cancellationReason", "cancelledAt", "createdAt", "updatedAt") VALUES (${escapeSQL(booking.id)}, ${escapeSQL(booking.bookingNumber)}, ${escapeSQL(booking.unitId)}, ${escapeSQL(booking.userId)}, ${formatTimestamp(booking.checkInDate)}, ${formatTimestamp(booking.checkOutDate)}, ${booking.nights}, ${booking.basePrice}, ${booking.totalNights}, ${booking.subtotal}, ${booking.cleaningFee}, ${booking.taxes}, ${booking.discountAmount}, ${booking.depositAmount}, ${booking.balanceAmount}, ${booking.totalPrice}, ${booking.guests}, ${escapeSQL(booking.guestName)}, ${escapeSQL(booking.guestEmail)}, ${escapeSQL(booking.guestPhone)}, ${booking.totalPaid}, ${escapeSQL(booking.paymentStatus)}, ${booking.depositPaid}, ${booking.balancePaid}, ${formatTimestamp(booking.balanceChargeDate)}, ${escapeSQL(booking.status)}, ${escapeSQL(booking.stripeCustomerId)}, ${escapeSQL(booking.cancellationReason)}, ${formatTimestamp(booking.cancelledAt)}, ${formatTimestamp(booking.createdAt)}, ${formatTimestamp(booking.updatedAt)});\n`;
    });
    sql += '\n';
  }
  
  // Insert Payments (if any)
  if (baseline.data.payment && baseline.data.payment.length > 0) {
    sql += '-- Insert Payments\n';
    baseline.data.payment.forEach((payment: any) => {
      sql += `INSERT INTO "Payment" ("id", "bookingId", "userId", "amount", "currency", "paymentType", "stripePaymentIntentId", "stripeChargeId", "stripeCustomerId", "status", "processedAt", "scheduledFor", "failureCount", "lastError", "description", "isRefundable", "refundAmount", "createdAt", "updatedAt") VALUES (${escapeSQL(payment.id)}, ${escapeSQL(payment.bookingId)}, ${escapeSQL(payment.userId)}, ${payment.amount}, ${escapeSQL(payment.currency)}, ${escapeSQL(payment.paymentType)}, ${escapeSQL(payment.stripePaymentIntentId)}, ${escapeSQL(payment.stripeChargeId)}, ${escapeSQL(payment.stripeCustomerId)}, ${escapeSQL(payment.status)}, ${formatTimestamp(payment.processedAt)}, ${formatTimestamp(payment.scheduledFor)}, ${payment.failureCount}, ${escapeSQL(payment.lastError)}, ${escapeSQL(payment.description)}, ${payment.isRefundable}, ${payment.refundAmount}, ${formatTimestamp(payment.createdAt)}, ${formatTimestamp(payment.updatedAt)});\n`;
    });
    sql += '\n';
  }
  
  return sql;
}

// Generate verification checklist
function generateVerificationChecklist() {
  logSection('GENERATING VERIFICATION CHECKLIST');
  
  const checklist = {
    timestamp: new Date().toISOString(),
    phase: 'PHASE 4: DATA MIGRATION VERIFICATION',
    checklist: {
      preMigration: [
        '✅ Supabase project created and accessible',
        '✅ DATABASE_URL environment variable configured',
        '✅ Supabase connection tested successfully',
        '✅ SQL migration scripts generated',
        '✅ Baseline snapshot loaded and verified'
      ],
      migrationExecution: [
        '□ Run table creation script in Supabase SQL Editor',
        '□ Run data insertion script in Supabase SQL Editor',
        '□ Verify no SQL errors occurred',
        '□ Check all tables created successfully',
        '□ Confirm foreign key constraints applied'
      ],
      postMigration: [
        '□ Verify row counts match baseline snapshot',
        '□ Verify all IDs preserved exactly from SQLite',
        '□ Verify slug values are identical',
        '□ Verify numeric fields (prices, fees) are identical',
        '□ Verify array fields (galleryImages, images) converted properly',
        '□ Verify coupon validation logic works',
        '□ Verify booking calculations match baseline',
        '□ Test property/unit relationships',
        '□ Test user authentication data'
      ],
      dataIntegrity: [
        '□ Properties: Count should be 6',
        '□ Units: Count should be 6',
        '□ Bookings: Count should be 1',
        '□ Users: Count should be 3',
        '□ Coupons: Count should be 3',
        '□ All property slugs unique and present',
        '□ All unit slugs present',
        '□ All main_image fields populated',
        '□ All basePrice values > 0',
        '□ All totalPrice calculations correct'
      ]
    },
    sqlCommands: {
      verificationQueries: [
        'SELECT COUNT(*) FROM "User";',
        'SELECT COUNT(*) FROM "Property";',
        'SELECT COUNT(*) FROM "Unit";',
        'SELECT COUNT(*) FROM "Booking";',
        'SELECT COUNT(*) FROM "Coupon";',
        'SELECT slug, name FROM "Property" ORDER BY slug;',
        'SELECT slug, name, basePrice FROM "Unit" ORDER BY slug;',
        'SELECT code, discountType, discountValue, isActive FROM "Coupon";',
        'SELECT bookingNumber, totalPrice, status FROM "Booking";'
      ]
    },
    nextSteps: [
      '1. Execute SQL migration in Supabase dashboard',
      '2. Run verification queries',
      '3. Proceed to Phase 5: Image migration',
      '4. Complete runtime verification'
    ]
  };
  
  writeFileSync('migration-verification-checklist.json', JSON.stringify(checklist, null, 2));
  logSuccess('Verification checklist saved to migration-verification-checklist.json');
  
  return checklist;
}

// Generate image migration instructions
function generateImageMigrationInstructions() {
  logSection('GENERATING IMAGE MIGRATION INSTRUCTIONS');
  
  const instructions = {
    timestamp: new Date().toISOString(),
    phase: 'PHASE 5: IMAGE MIGRATION PREPARATION',
    currentImagePaths: {
      localSource: '/uploads/',
      samplePaths: [
        '/uploads/mainImage-1772418181980-300596449.jpg',
        '/uploads/mainImage-1772418424055-383530146.jpg',
        '/uploads/mainImage-1772418561929-485202986.avif',
        '/uploads/images-1772418226500-525554115.jpg',
        '/uploads/images-1772418452491-638849038.jpg'
      ]
    },
    targetImagePaths: {
      supabaseFormat: 'https://[PROJECT_REF].supabase.co/storage/v1/object/public/[BUCKET]/[FILENAME]',
      bucketName: 'property-images',
      publicAccess: true
    },
    migrationSteps: [
      '1. Create Supabase Storage bucket named "property-images"',
      '2. Set bucket to public access',
      '3. Upload all files from local /uploads/ directory',
      '4. Generate public URLs for all uploaded images',
      '5. Update database image paths with Supabase URLs',
      '6. Verify all images load correctly'
    ],
    sqlUpdateTemplate: `
-- Update property main images
UPDATE "Property" 
SET mainImage = REPLACE(mainImage, '/uploads/', 'https://[PROJECT_REF].supabase.co/storage/v1/object/public/property-images/')
WHERE mainImage LIKE '/uploads/%';

-- Update property gallery images (array field)
UPDATE "Property" 
SET galleryImages = ARRAY(
  SELECT REPLACE(unnest(galleryImages), '/uploads/', 'https://[PROJECT_REF].supabase.co/storage/v1/object/public/property-images/')
  WHERE unnest(galleryImages) LIKE '/uploads/%'
)
WHERE galleryImages IS NOT NULL;

-- Update unit images (array field)  
UPDATE "Unit" 
SET images = ARRAY(
  SELECT REPLACE(unnest(images), '/uploads/', 'https://[PROJECT_REF].supabase.co/storage/v1/object/public/property-images/')
  WHERE unnest(images) LIKE '/uploads/%'
)
WHERE images IS NOT NULL;
`
  };
  
  writeFileSync('image-migration-instructions.json', JSON.stringify(instructions, null, 2));
  logSuccess('Image migration instructions saved to image-migration-instructions.json');
  
  return instructions;
}

// Main execution
async function main() {
  log('cyan', '📊 PHASE 4: DATA MIGRATION TO SUPABASE');
  log('cyan', '=====================================');
  
  const sqlGenerated = generateSQLMigration();
  if (!sqlGenerated) {
    logError('SQL generation failed. Cannot proceed.');
    process.exit(1);
  }
  
  const checklistGenerated = generateVerificationChecklist();
  const instructionsGenerated = generateImageMigrationInstructions();
  
  logSection('PHASE 4 COMPLETION');
  logSuccess('Data migration scripts generated successfully');
  
  logSection('FILES CREATED');
  logInfo('📄 supabase-migration-complete.sql - Complete migration script');
  logInfo('📄 01-table-creation.sql - Table creation only');
  logInfo('📄 02-data-insertion.sql - Data insertion only');
  logInfo('📄 migration-verification-checklist.json - Verification checklist');
  logInfo('📄 image-migration-instructions.json - Image migration guide');
  
  logSection('EXECUTION INSTRUCTIONS');
  logInfo('1. Open Supabase dashboard → SQL Editor');
  logInfo('2. Copy and paste contents of supabase-migration-complete.sql');
  logInfo('3. Execute the script (may take 1-2 minutes)');
  logInfo('4. Verify results in the "Results" tab');
  logInfo('5. Check that all row counts match baseline');
  
  logSection('NEXT STEPS');
  logInfo('✅ Data migration scripts ready');
  logInfo('⏳ Execute migration in Supabase dashboard');
  logInfo('⏳ Run verification queries');
  logInfo('⏳ Proceed to Phase 5: Image migration');
  
  logSection('VERIFICATION REQUIRED');
  logWarning('⚠️  Do not proceed to Phase 5 until:');
  logWarning('  • All SQL scripts execute without errors');
  logWarning('  • Row counts match baseline snapshot');
  logWarning('  • All data integrity checks pass');
}

main();
