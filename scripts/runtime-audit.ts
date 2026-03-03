#!/usr/bin/env node

/**
 * RUNTIME PRODUCTION AUDIT
 * 
 * This script performs actual runtime inspection of the application
 * to verify Supabase integration and production readiness.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

// ANSI color codes for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
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

function logWarning(message: string) {
  log('yellow', `⚠️  ${message}`);
}

function logError(message: string) {
  log('red', `❌ ${message}`);
}

function logInfo(message: string) {
  log('blue', `ℹ️  ${message}`);
}

// PHASE 1: Runtime Detection
function phase1RuntimeDetection() {
  logSection('PHASE 1: RUNTIME ENVIRONMENT DETECTION');
  
  logInfo('Creating runtime inspection script...');
  
  const runtimeScript = `
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment
dotenv.config();

console.log('=== RUNTIME ENVIRONMENT INSPECTION ===');

// Environment detection
console.log('ENV MODE:', import.meta.env?.MODE || process.env.NODE_ENV || 'unknown');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);

// Database connection test
async function testDatabase() {
  try {
    console.log('\\n--- DATABASE CONNECTION TEST ---');
    
    // Test Prisma connection
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ Prisma database connection: SUCCESS');
    
    // Get database info
    const result = await prisma.$queryRaw\`SELECT version()\` as any;
    console.log('Database version:', result[0]?.version || 'Unknown');
    
    // Test Supabase connection if configured
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      const { data, error } = await supabase.from('properties').select('count').limit(1);
      if (error) {
        console.log('❌ Supabase connection:', error.message);
      } else {
        console.log('✅ Supabase connection: SUCCESS');
      }
    }
    
    // Query actual data
    console.log('\\n--- DATA VERIFICATION ---');
    
    const propertyCount = await prisma.property.count();
    console.log('Properties count:', propertyCount);
    
    const unitCount = await prisma.unit.count();
    console.log('Units count:', unitCount);
    
    const couponCount = await prisma.coupon.count();
    console.log('Coupons count:', couponCount);
    
    // Get sample data
    if (propertyCount > 0) {
      const sampleProperty = await prisma.property.findFirst({
        select: {
          id: true,
          name: true,
          slug: true,
          mainImage: true,
          galleryImages: true
        }
      });
      console.log('Sample property:', sampleProperty);
      
      if (sampleProperty?.mainImage) {
        console.log('Main image URL:', sampleProperty.mainImage);
        console.log('Image URL analysis:');
        console.log('  - Starts with https:', sampleProperty.mainImage.startsWith('https://'));
        console.log('  - Contains supabase.co:', sampleProperty.mainImage.includes('supabase.co'));
        console.log('  - Contains localhost:', sampleProperty.mainImage.includes('localhost'));
        console.log('  - Contains /uploads/:', sampleProperty.mainImage.includes('/uploads/'));
      }
    }
    
    if (unitCount > 0) {
      const sampleUnit = await prisma.unit.findFirst({
        select: {
          id: true,
          name: true,
          slug: true,
          images: true,
          basePrice: true
        }
      });
      console.log('Sample unit:', sampleUnit);
      
      if (sampleUnit?.images) {
        try {
          const images = JSON.parse(sampleUnit.images);
          if (images.length > 0) {
            console.log('Sample unit image:', images[0]);
          }
        } catch (e) {
          console.log('Unit images parse error:', e);
        }
      }
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.log('❌ Database test failed:', error.message);
    if (error.message.includes('sqlite') || error.message.includes('file:')) {
      console.log('❌ SQLITE DETECTED - DEPLOYMENT BLOCKED');
    }
  }
}

// Stripe configuration test
function testStripe() {
  console.log('\\n--- STRIPE CONFIGURATION ---');
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const stripePublishable = process.env.STRIPE_PUBLISHABLE_KEY;
  
  if (stripeSecret) {
    console.log('Stripe secret key prefix:', stripeSecret.substring(0, 8));
    if (stripeSecret.startsWith('sk_test_')) {
      console.log('Stripe mode: TEST');
    } else if (stripeSecret.startsWith('sk_live_')) {
      console.log('Stripe mode: LIVE');
    } else {
      console.log('❌ Invalid Stripe key format');
    }
  } else {
    console.log('❌ Stripe secret key missing');
  }
  
  if (stripePublishable) {
    console.log('Stripe publishable key prefix:', stripePublishable.substring(0, 8));
  } else {
    console.log('❌ Stripe publishable key missing');
  }
}

// Environment variables check
function checkEnvironment() {
  console.log('\\n--- ENVIRONMENT VARIABLES ---');
  const criticalVars = [
    'DATABASE_URL',
    'NODE_ENV',
    'API_URL',
    'FRONTEND_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'JWT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ];
  
  criticalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      if (varName.includes('SECRET') || varName.includes('KEY')) {
        console.log(\`✅ \${varName}: \${value.substring(0, 8)}...\`);
      } else {
        console.log(\`✅ \${varName}: \${value}\`);
      }
    } else {
      console.log(\`❌ \${varName}: MISSING\`);
    }
  });
}

// Run all tests
async function main() {
  checkEnvironment();
  testStripe();
  await testDatabase();
}

main().catch(console.error);
`;
  
  // Write runtime script
  writeFileSync('runtime-inspection.mjs', runtimeScript);
  
  try {
    logInfo('Running runtime inspection...');
    const result = execSync('node runtime-inspection.mjs', { 
      encoding: 'utf8',
      cwd: process.cwd(),
      timeout: 30000
    });
    console.log(result);
    logSuccess('Runtime inspection completed');
  } catch (error) {
    logError(`Runtime inspection failed: ${error.message}`);
    if (error.stdout) {
      console.log(error.stdout);
    }
  }
}

// PHASE 2: SQLite Verification
function phase2SQLiteVerification() {
  logSection('PHASE 2: SQLITE VERIFICATION');
  
  logInfo('Searching for SQLite patterns in codebase...');
  
  const sqlitePatterns = [
    'sqlite',
    'file:./dev.db',
    '/uploads/',
    'multer',
    'express.static.*uploads',
    'provider = "sqlite"'
  ];
  
  const dangerousFiles = [];
  
  try {
    // Search for SQLite patterns
    sqlitePatterns.forEach(pattern => {
      try {
        const grepResult = execSync(`grep -r -n "${pattern}" --include="*.ts" --include="*.js" --include="*.json" --include="*.prisma" .`, { 
          encoding: 'utf8',
          cwd: process.cwd()
        });
        
        if (grepResult.trim()) {
          logWarning(`Pattern "${pattern}" found:`);
          grepResult.split('\n').forEach(line => {
            if (line.trim()) {
              logWarning(`  ${line}`);
              const filePath = line.split(':')[0];
              if (!dangerousFiles.includes(filePath)) {
                dangerousFiles.push(filePath);
              }
            }
          });
        }
      } catch (error) {
        // No matches found for this pattern
      }
    });
    
    if (dangerousFiles.length === 0) {
      logSuccess('No SQLite patterns found in codebase');
    } else {
      logWarning(`SQLite patterns found in ${dangerousFiles.length} files:`);
      dangerousFiles.forEach(file => logWarning(`  - ${file}`));
    }
    
  } catch (error) {
    logError(`SQLite verification failed: ${error.message}`);
  }
}

// PHASE 3: Storage Validation
function phase3StorageValidation() {
  logSection('PHASE 3: STORAGE VALIDATION');
  
  logInfo('Checking image URL patterns in database...');
  
  const storageCheckScript = `
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

async function checkStorage() {
  const prisma = new PrismaClient();
  
  try {
    console.log('--- IMAGE STORAGE ANALYSIS ---');
    
    // Get image URLs from properties
    const properties = await prisma.property.findMany({
      select: {
        id: true,
        name: true,
        mainImage: true,
        galleryImages: true
      },
      take: 5
    });
    
    console.log('Property images:');
    properties.forEach(prop => {
      console.log(\`  \${prop.name} (\${prop.id}):\`);
      console.log(\`    Main: \${prop.mainImage}\`);
      
      // Analyze main image
      if (prop.mainImage) {
        const isHttps = prop.mainImage.startsWith('https://');
        const isSupabase = prop.mainImage.includes('supabase.co');
        const isLocalhost = prop.mainImage.includes('localhost');
        const isUploads = prop.mainImage.includes('/uploads/');
        
        console.log(\`    Analysis: HTTPS=\${isHttps}, Supabase=\${isSupabase}, Localhost=\${isLocalhost}, Uploads=\${isUploads}\`);
        
        if (!isHttps || !isSupabase || isLocalhost || isUploads) {
          console.log(\`    ❌ INVALID IMAGE URL DETECTED\`);
        } else {
          console.log(\`    ✅ Valid Supabase URL\`);
        }
      }
      
      // Check gallery images
      if (prop.galleryImages) {
        try {
          const gallery = JSON.parse(prop.galleryImages);
          if (gallery.length > 0) {
            console.log(\`    Gallery sample: \${gallery[0]}\`);
          }
        } catch (e) {
          console.log(\`    Gallery parse error\`);
        }
      }
    });
    
    // Get image URLs from units
    const units = await prisma.unit.findMany({
      select: {
        id: true,
        name: true,
        images: true
      },
      take: 3
    });
    
    console.log('\\nUnit images:');
    units.forEach(unit => {
      console.log(\`  \${unit.name} (\${unit.id}):\`);
      if (unit.images) {
        try {
          const images = JSON.parse(unit.images);
          if (images.length > 0) {
            console.log(\`    Sample: \${images[0]}\`);
            
            const isHttps = images[0].startsWith('https://');
            const isSupabase = images[0].includes('supabase.co');
            const isLocalhost = images[0].includes('localhost');
            const isUploads = images[0].includes('/uploads/');
            
            console.log(\`    Analysis: HTTPS=\${isHttps}, Supabase=\${isSupabase}, Localhost=\${isLocalhost}, Uploads=\${isUploads}\`);
          }
        } catch (e) {
          console.log(\`    Images parse error\`);
        }
      }
    });
    
  } catch (error) {
    console.log('Storage check failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkStorage();
`;
  
  writeFileSync('storage-check.mjs', storageCheckScript);
  
  try {
    const result = execSync('node storage-check.mjs', { 
      encoding: 'utf8',
      cwd: process.cwd(),
      timeout: 30000
    });
    console.log(result);
  } catch (error) {
    logError(`Storage validation failed: ${error.message}`);
    if (error.stdout) console.log(error.stdout);
  }
}

// PHASE 4: Database Provider Verification
function phase4DatabaseProvider() {
  logSection('PHASE 4: DATABASE PROVIDER VERIFICATION');
  
  // Check Prisma schema
  if (existsSync('prisma/schema.prisma')) {
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    
    logInfo('Prisma schema analysis:');
    
    if (schema.includes('provider = "postgresql"')) {
      logSuccess('✅ Prisma provider: PostgreSQL');
    } else if (schema.includes('provider = "sqlite"')) {
      logError('❌ Prisma provider: SQLite (DEPLOYMENT BLOCKED)');
    } else {
      logWarning('⚠️  Prisma provider: Unknown');
    }
    
    if (schema.includes('env("DATABASE_URL")')) {
      logSuccess('✅ Uses environment variable for database URL');
    } else {
      logWarning('⚠️  Database URL not from environment');
    }
  } else {
    logError('❌ Prisma schema not found');
  }
  
  // Check environment variable
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    logInfo('DATABASE_URL analysis:');
    logInfo(`  Prefix: ${dbUrl.substring(0, 12)}`);
    logInfo(`  Contains supabase: ${dbUrl.includes('supabase')}`);
    logInfo(`  Contains postgresql: ${dbUrl.startsWith('postgresql://')}`);
    logInfo(`  Contains file: ${dbUrl.includes('file:')}`);
    logInfo(`  Contains sqlite: ${dbUrl.includes('sqlite')}`);
    
    if (dbUrl.startsWith('postgresql://') && dbUrl.includes('supabase')) {
      logSuccess('✅ Valid Supabase PostgreSQL URL');
    } else if (dbUrl.includes('file:') || dbUrl.includes('sqlite')) {
      logError('❌ SQLite/Local database detected (DEPLOYMENT BLOCKED)');
    } else {
      logWarning('⚠️  Unknown database configuration');
    }
  } else {
    logError('❌ DATABASE_URL not set');
  }
}

// PHASE 5: Stripe Mode Detection
function phase5StripeDetection() {
  logSection('PHASE 5: STRIPE MODE DETECTION');
  
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const stripePublishable = process.env.STRIPE_PUBLISHABLE_KEY;
  
  logInfo('Stripe configuration analysis:');
  
  if (stripeSecret) {
    const prefix = stripeSecret.substring(0, 8);
    logInfo(`Secret key prefix: ${prefix}`);
    
    if (stripeSecret.startsWith('sk_test_')) {
      logSuccess('✅ Stripe mode: TEST (appropriate for staging)');
    } else if (stripeSecret.startsWith('sk_live_')) {
      logSuccess('✅ Stripe mode: LIVE (production ready)');
    } else {
      logError('❌ Invalid Stripe secret key format');
    }
  } else {
    logError('❌ Stripe secret key missing');
  }
  
  if (stripePublishable) {
    const prefix = stripePublishable.substring(0, 8);
    logInfo(`Publishable key prefix: ${prefix}`);
    
    if (stripePublishable.startsWith('pk_test_')) {
      logSuccess('✅ Publishable key: TEST mode');
    } else if (stripePublishable.startsWith('pk_live_')) {
      logSuccess('✅ Publishable key: LIVE mode');
    } else {
      logError('❌ Invalid Stripe publishable key format');
    }
  } else {
    logError('❌ Stripe publishable key missing');
  }
  
  // Check webhook secret
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (webhookSecret) {
    logSuccess('✅ Stripe webhook secret configured');
  } else {
    logWarning('⚠️  Stripe webhook secret missing');
  }
}

// PHASE 6: Netlify Deploy Readiness
function phase6NetlifyReadiness() {
  logSection('PHASE 6: NETLIFY DEPLOY READINESS');
  
  // Check environment variables
  const requiredVars = [
    'DATABASE_URL',
    'NODE_ENV',
    'API_URL',
    'FRONTEND_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'JWT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ];
  
  logInfo('Environment variable readiness:');
  let readyCount = 0;
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      logSuccess(`✅ ${varName}: CONFIGURED`);
      readyCount++;
    } else {
      logError(`❌ ${varName}: MISSING`);
    }
  });
  
  logInfo(`Environment readiness: ${readyCount}/${requiredVars.length} variables configured`);
  
  // Check for hardcoded URLs
  logInfo('Checking for hardcoded URLs...');
  
  try {
    const localhostResult = execSync('grep -r "localhost" --include="*.ts" --include="*.js" --include="*.tsx" client/', { encoding: 'utf8' });
    if (localhostResult.trim()) {
      logWarning('⚠️  Localhost references found in client code:');
      localhostResult.split('\n').slice(0, 5).forEach(line => {
        if (line.trim()) logWarning(`  ${line}`);
      });
    } else {
      logSuccess('✅ No localhost references in client code');
    }
  } catch (error) {
    logSuccess('✅ No localhost references in client code');
  }
  
  // Check Netlify configuration
  if (existsSync('netlify.toml')) {
    const netlifyConfig = readFileSync('netlify.toml', 'utf8');
    logSuccess('✅ Netlify configuration exists');
    
    if (netlifyConfig.includes('/api/*')) {
      logSuccess('✅ API redirects configured');
    }
    
    if (netlifyConfig.includes('/uploads/*')) {
      logWarning('⚠️  Uploads redirect may need updating for Supabase');
    }
  } else {
    logError('❌ Netlify configuration missing');
  }
}

// Main execution
function main() {
  log('cyan', '🔍 RUNTIME PRODUCTION AUDIT');
  log('cyan', '=====================================');
  
  phase1RuntimeDetection();
  phase2SQLiteVerification();
  phase3StorageValidation();
  phase4DatabaseProvider();
  phase5StripeDetection();
  phase6NetlifyReadiness();
  
  logSection('AUDIT SUMMARY');
  logInfo('Runtime inspection completed. Review results above for deployment readiness.');
}

// Run the audit
main();
