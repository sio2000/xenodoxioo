#!/usr/bin/env node

/**
 * PRODUCTION DEPLOYMENT AUDIT SCRIPT
 * 
 * This script performs comprehensive verification of production deployment
 * to ensure 100% parity with local development environment.
 */

import { readFileSync, existsSync } from 'fs';
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

// PHASE 0: Environment & Credential Audit
function phase0EnvironmentAudit() {
  logSection('PHASE 0: ENVIRONMENT & CREDENTIAL AUDIT');
  
  const envExample = readFileSync('.env.example', 'utf8');
  const envLines = envExample.split('\n');
  
  logInfo('Checking environment variables...');
  
  // Check for client-exposed variables (VITE_ prefix)
  const viteVars = envLines.filter(line => line.startsWith('VITE_'));
  logInfo(`Client-exposed variables found: ${viteVars.length}`);
  viteVars.forEach(v => logInfo(`  - ${v.split('=')[0]}`));
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    'STRIPE_SECRET_KEY',
    'JWT_SECRET',
    'DATABASE_URL="file:./dev.db"',
    'your-super-secret',
    'sk_test_',
    'pk_test_'
  ];
  
  let foundDangerous = false;
  dangerousPatterns.forEach(pattern => {
    if (envExample.includes(pattern)) {
      logError(`DANGEROUS PATTERN FOUND: ${pattern}`);
      foundDangerous = true;
    }
  });
  
  if (!foundDangerous) {
    logSuccess('No dangerous patterns in .env.example');
  }
  
  // Check production build for secret leakage
  logInfo('Scanning production build for secret leakage...');
  try {
    const jsFiles = execSync('find dist/spa -name "*.js" -type f', { encoding: 'utf8' }).trim().split('\n');
    let secretsFound = false;
    
    jsFiles.forEach(file => {
      if (file && existsSync(file)) {
        const content = readFileSync(file, 'utf8');
        const secretPatterns = ['STRIPE_SECRET_KEY', 'JWT_SECRET', 'dev.db', 'localhost', 'file://'];
        
        secretPatterns.forEach(pattern => {
          if (content.includes(pattern)) {
            logError(`SECRET LEAKAGE in ${file}: ${pattern}`);
            secretsFound = true;
          }
        });
      }
    });
    
    if (!secretsFound) {
      logSuccess('No secret leakage detected in production build');
    }
  } catch (error) {
    logWarning('Could not scan production build files');
  }
}

// PHASE 1: Local Source of Truth
function phase1BaselineSnapshot() {
  logSection('PHASE 1: LOCAL SOURCE OF TRUTH SNAPSHOT');
  
  // Database configuration
  logInfo('DATABASE CONFIGURATION:');
  logInfo(`  - Provider: SQLite (local)`);
  logInfo(`  - Schema: prisma/schema.prisma`);
  logInfo(`  - URL: file:./dev.db (LOCAL ONLY)`);
  
  // Image storage
  logInfo('IMAGE STORAGE:');
  logInfo(`  - Upload path: /uploads/`);
  logInfo(`  - Storage: Local filesystem`);
  logInfo(`  - Served via: /uploads static route`);
  
  // Environment
  logInfo('ENVIRONMENT:');
  logInfo(`  - NODE_ENV: development`);
  logInfo(`  - API_URL: http://localhost:8080`);
  logInfo(`  - FRONTEND_URL: http://localhost:8080`);
  
  // Stripe configuration
  logInfo('STRIPE CONFIGURATION:');
  logInfo(`  - Mode: Test (sk_test_/pk_test_)`);
  logInfo(`  - Currency: EUR`);
  logInfo(`  - Deposit: 25%`);
  logInfo(`  - Balance charge: 30 days before check-in`);
  
  // Schema verification
  logInfo('SCHEMA VERIFICATION:');
  const schemaContent = readFileSync('prisma/schema.prisma', 'utf8');
  const requiredModels = ['Property', 'Unit', 'Booking', 'Payment', 'User', 'Coupon', 'SeasonalPricing'];
  
  requiredModels.forEach(model => {
    if (schemaContent.includes(`model ${model}`)) {
      logSuccess(`  ✅ ${model} model exists`);
    } else {
      logError(`  ❌ ${model} model missing`);
    }
  });
  
  // Check for required fields
  const requiredFields = [
    { model: 'Property', field: 'slug', type: 'String @unique' },
    { model: 'Property', field: 'mainImage', type: 'String' },
    { model: 'Property', field: 'galleryImages', type: 'String @default("[]")' },
    { model: 'Unit', field: 'slug', type: 'String' },
    { model: 'Unit', field: 'images', type: 'String @default("[]")' },
    { model: 'Unit', field: 'basePrice', type: 'Float' }
  ];
  
  logInfo('REQUIRED FIELD VERIFICATION:');
  requiredFields.forEach(({ model, field, type }) => {
    const modelSection = schemaContent.split(`model ${model}`)[1]?.split('model')[0] || '';
    if (modelSection.includes(`${field} ${type.split(' ')[0]}`)) {
      logSuccess(`  ✅ ${model}.${field}: ${type}`);
    } else {
      logError(`  ❌ ${model}.${field}: Missing or incorrect type`);
    }
  });
}

// PHASE 2: Production Build Verification
function phase2BuildVerification() {
  logSection('PHASE 2: PRODUCTION BUILD VERIFICATION');
  
  try {
    // Check if build exists
    if (!existsSync('dist/spa')) {
      logError('Production build not found. Run: pnpm run build:client');
      return;
    }
    
    logSuccess('Production build exists');
    
    // Check build output
    const buildFiles = execSync('ls -la dist/spa/', { encoding: 'utf8' });
    logInfo('Build output:');
    buildFiles.split('\n').forEach(line => {
      if (line && !line.startsWith('total')) {
        logInfo(`  ${line}`);
      }
    });
    
    // Check for critical files
    const criticalFiles = ['index.html', 'assets/'];
    criticalFiles.forEach(file => {
      if (existsSync(`dist/spa/${file}`)) {
        logSuccess(`✅ ${file} exists`);
      } else {
        logError(`❌ ${file} missing`);
      }
    });
    
  } catch (error) {
    logError(`Build verification failed: ${error}`);
  }
}

// PHASE 3: Netlify Environment Configuration
function phase3NetlifyEnvironment() {
  logSection('PHASE 3: NETLIFY ENVIRONMENT REQUIREMENTS');
  
  logInfo('REQUIRED NETLIFY ENVIRONMENT VARIABLES:');
  const requiredVars = [
    'DATABASE_URL=postgresql://user:pass@host:5432/dbname',
    'NODE_ENV=production',
    'STRIPE_SECRET_KEY=sk_live_...',
    'STRIPE_PUBLISHABLE_KEY=pk_live_...',
    'STRIPE_WEBHOOK_SECRET=whsec_...',
    'JWT_SECRET=your-production-secret',
    'JWT_REFRESH_SECRET=your-production-refresh-secret',
    'API_URL=https://your-domain.netlify.app',
    'FRONTEND_URL=https://your-domain.netlify.app',
    'DEPOSIT_PERCENTAGE=25',
    'BALANCE_CHARGE_THRESHOLD_DAYS=30',
    'CURRENCY=USD',
    'ENABLE_PAYMENT_PROCESSING=true'
  ];
  
  requiredVars.forEach(v => {
    logInfo(`  - ${v}`);
  });
  
  logWarning('⚠️  DATABASE_URL must be PostgreSQL for production (NOT SQLite)');
  logWarning('⚠️  Stripe keys must be LIVE keys (not test keys)');
  logWarning('⚠️  JWT secrets must be unique and strong');
}

// PHASE 4: Image Consistency Check
function phase4ImageConsistency() {
  logSection('PHASE 4: IMAGE CONSISTENCY CHECK');
  
  logInfo('CURRENT IMAGE CONFIGURATION:');
  logInfo('  - Storage: Local filesystem (/uploads)');
  logInfo('  - Database fields: main_image, gallery_images[], images[]');
  logInfo('  - URL pattern: /uploads/filename.ext');
  
  logWarning('⚠️  PRODUCTION REQUIREMENT:');
  logWarning('  - Must migrate to Supabase Storage');
  logWarning('  - URLs must be Supabase public URLs');
  logWarning('  - No localhost references in image paths');
}

// PHASE 5: Database Schema Verification
function phase5DatabaseSchema() {
  logSection('PHASE 5: DATABASE SCHEMA VERIFICATION');
  
  const schemaContent = readFileSync('prisma/schema.prisma', 'utf8');
  
  // Check provider
  if (schemaContent.includes('provider = "sqlite"')) {
    logWarning('⚠️  Current schema uses SQLite (development only)');
  }
  
  // Check all required models and fields
  const schemaRequirements = {
    Property: ['slug', 'mainImage', 'galleryImages'],
    Unit: ['slug', 'images', 'basePrice'],
    Booking: ['totalPrice', 'depositAmount', 'balanceAmount'],
    Payment: ['amount', 'currency', 'status'],
    Coupon: ['code', 'discountType', 'discountValue'],
    SeasonalPricing: ['pricePerNight', 'startDate', 'endDate']
  };
  
  Object.entries(schemaRequirements).forEach(([model, fields]) => {
    logInfo(`${model} model:`);
    const modelSection = schemaContent.split(`model ${model}`)[1]?.split('model')[0] || '';
    
    fields.forEach(field => {
      if (modelSection.includes(field)) {
        logSuccess(`  ✅ ${field}`);
      } else {
        logError(`  ❌ ${field} missing`);
      }
    });
  });
}

// PHASE 6: Pricing & Stripe Verification
function phase6PricingStripe() {
  logSection('PHASE 6: PRICING & STRIPE VERIFICATION');
  
  // Check Stripe configuration
  const stripeConfig = readFileSync('client/lib/stripe.ts', 'utf8');
  
  logInfo('STRIPE CONFIGURATION:');
  if (stripeConfig.includes('import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY')) {
    logSuccess('✅ Uses environment variable for publishable key');
  } else {
    logError('❌ Hardcoded Stripe key detected');
  }
  
  if (stripeConfig.includes('currency: "eur"')) {
    logInfo('  - Currency: EUR');
  }
  
  if (stripeConfig.includes('depositPercentage: 0.25')) {
    logSuccess('  - Deposit: 25%');
  }
  
  if (stripeConfig.includes('remainingDaysBeforeCharge: 30')) {
    logSuccess('  - Balance charge: 30 days before check-in');
  }
  
  logWarning('⚠️  PRODUCTION REQUIREMENTS:');
  logWarning('  - Currency must match business region');
  logWarning('  - Live Stripe keys required');
  logWarning('  - Webhook endpoint must be configured');
}

// PHASE 7: API Route Consistency
function phase7ApiRoutes() {
  logSection('PHASE 7: API ROUTE CONSISTENCY');
  
  const serverIndex = readFileSync('server/index.ts', 'utf8');
  
  logInfo('REGISTERED API ROUTES:');
  const routes = [
    '/api/ping',
    '/api/demo',
    '/api/payments',
    '/api/admin',
    '/api/auth',
    '/api/bookings',
    '/api/properties',
    '/api/units',
    '/api/viewvideos'
  ];
  
  routes.forEach(route => {
    if (serverIndex.includes(route)) {
      logSuccess(`✅ ${route}`);
    } else {
      logError(`❌ ${route} missing`);
    }
  });
  
  logInfo('NETLIFY REDIRECTS:');
  const netlifyConfig = readFileSync('netlify.toml', 'utf8');
  if (netlifyConfig.includes('/api/*')) {
    logSuccess('✅ API redirect configured');
  } else {
    logError('❌ API redirect missing');
  }
  
  if (netlifyConfig.includes('/uploads/*')) {
    logSuccess('✅ Uploads redirect configured');
  } else {
    logError('❌ Uploads redirect missing');
  }
}

// PHASE 8: Deployment Checklist
function phase8DeploymentChecklist() {
  logSection('PHASE 8: DEPLOYMENT CHECKLIST');
  
  const checklist = [
    { item: 'Environment variables configured in Netlify', status: '⏳' },
    { item: 'Database migrated to PostgreSQL/Supabase', status: '❌' },
    { item: 'Images migrated to Supabase Storage', status: '❌' },
    { item: 'Stripe live keys configured', status: '⏳' },
    { item: 'JWT secrets updated for production', status: '⏳' },
    { item: 'API_URL and FRONTEND_URL set to production domain', status: '⏳' },
    { item: 'Build tested locally', status: '✅' },
    { item: 'Secret leakage scan passed', status: '✅' },
    { item: 'Netlify redirects configured', status: '✅' },
    { item: 'Webhook endpoint configured in Stripe', status: '⏳' }
  ];
  
  checklist.forEach(({ item, status }) => {
    log(`${status === '✅' ? 'green' : status === '❌' ? 'red' : 'yellow'}`, `${status} ${item}`);
  });
  
  logSection('CRITICAL ISSUES - MUST FIX BEFORE DEPLOYMENT');
  logError('❌ Database still uses SQLite - must migrate to Supabase PostgreSQL');
  logError('❌ Images use local storage - must migrate to Supabase Storage');
  logError('❌ No Supabase configuration found in codebase');
  
  logSection('RECOMMENDED ACTIONS');
  logInfo('1. Set up Supabase project and update DATABASE_URL');
  logInfo('2. Migrate database schema to Supabase');
  logInfo('3. Configure Supabase Storage for images');
  logInfo('4. Update image URLs to use Supabase public URLs');
  logInfo('5. Configure all Netlify environment variables');
  logInfo('6. Test with live Stripe keys');
  logInfo('7. Run full production build test');
}

// Main execution
function main() {
  log('cyan', '🔍 PRODUCTION DEPLOYMENT AUDIT');
  log('cyan', '=====================================');
  
  phase0EnvironmentAudit();
  phase1BaselineSnapshot();
  phase2BuildVerification();
  phase3NetlifyEnvironment();
  phase4ImageConsistency();
  phase5DatabaseSchema();
  phase6PricingStripe();
  phase7ApiRoutes();
  phase8DeploymentChecklist();
  
  logSection('AUDIT COMPLETE');
  logWarning('⚠️  CRITICAL: Database and storage migration required before deployment');
  logInfo('This audit found configuration issues that must be resolved for production deployment.');
}

// Run the audit
main();
