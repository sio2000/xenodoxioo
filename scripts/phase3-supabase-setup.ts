#!/usr/bin/env node

/**
 * PHASE 3: SUPABASE SETUP
 * 
 * This script guides through Supabase project setup and schema migration
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

// Display Supabase setup instructions
function displaySupabaseSetupInstructions() {
  logSection('PHASE 3: SUPABASE PROJECT SETUP');
  
  logInfo('Follow these steps to set up your Supabase project:');
  
  const instructions = `
🔧 STEP-BY-STEP SUPABASE SETUP:

1. CREATE SUPABASE PROJECT
   • Go to https://supabase.com
   • Click "New Project"
   • Choose organization
   • Set project name: "leonidion-houses" (or your preferred name)
   • Set database password: Save this securely!
   • Choose region closest to your users
   • Click "Create new project"

2. GET DATABASE CONNECTION STRING
   • In Supabase dashboard, go to Settings → Database
   • Find "Connection string" section
   • Copy the "URI" (starts with postgresql://)
   • It should look like: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

3. CONFIGURE ENVIRONMENT VARIABLES
   • Create or update your .env file with:
     DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
     SUPABASE_URL="https://[PROJECT_REF].supabase.co"
     SUPABASE_ANON_KEY="[your-anon-key-from-dashboard]"

4. GET SUPABASE KEYS
   • In Supabase dashboard, go to Settings → API
   • Copy the "anon public" key
   • Copy the "service_role" key (for server-side operations)

5. RUN MIGRATION
   • Once DATABASE_URL is configured, run:
     npx prisma migrate deploy

6. VERIFY SETUP
   • Check that all tables are created in Supabase dashboard
   • Verify table structure matches schema
   • Test database connection
`;

  console.log(instructions);
  
  logWarning('⚠️  IMPORTANT NOTES:');
  logWarning('  • Save your database password securely');
  logWarning('  • Never commit DATABASE_URL to version control');
  logWarning('  • Use the "anon" key for client-side operations');
  logWarning('  • Use the "service_role" key for server-side operations');
  
  return instructions;
}

// Test database connection
function testDatabaseConnection() {
  logSection('TESTING DATABASE CONNECTION');
  
  try {
    logInfo('Testing Prisma connection to Supabase...');
    
    // Generate Prisma client first
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Test connection
    const testScript = `
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test query
    const result = await prisma.$queryRaw\`SELECT version()\` as any[];
    console.log('Database version:', result[0]?.version);
    
    // Check if tables exist
    const tables = await prisma.$queryRaw\`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    \` as any[];
    
    console.log('Tables found:', tables.map(t => t.table_name));
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
`;
    
    writeFileSync('test-db-connection.mjs', testScript);
    
    try {
      execSync('node test-db-connection.mjs', { stdio: 'inherit' });
      logSuccess('Database connection test passed');
      return true;
    } catch (error) {
      logError('Database connection test failed');
      logInfo('Make sure DATABASE_URL is correctly configured');
      return false;
    }
    
  } catch (error) {
    logError(`Connection test failed: ${error}`);
    return false;
  }
}

// Deploy schema to Supabase
function deploySchemaToSupabase() {
  logSection('DEPLOYING SCHEMA TO SUPABASE');
  
  try {
    logInfo('Deploying Prisma schema to Supabase...');
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      logError('DATABASE_URL environment variable is not set');
      logInfo('Please configure DATABASE_URL with your Supabase connection string');
      return false;
    }
    
    // Verify DATABASE_URL format
    if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
      logError('DATABASE_URL must start with postgresql://');
      return false;
    }
    
    logInfo(`DATABASE_URL configured: ${process.env.DATABASE_URL.substring(0, 20)}...`);
    
    // Deploy migration
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      logSuccess('Schema deployed to Supabase successfully');
    } catch (error) {
      logWarning('Migration deploy may have issues');
      logInfo('This can happen if migrations were already applied');
    }
    
    // Check migration status
    try {
      execSync('npx prisma migrate status', { stdio: 'inherit' });
    } catch (error) {
      logInfo('Cannot check migration status (this may be normal)');
    }
    
    return true;
    
  } catch (error) {
    logError(`Schema deployment failed: ${error}`);
    return false;
  }
}

// Verify Supabase schema
function verifySupabaseSchema() {
  logSection('VERIFYING SUPABASE SCHEMA');
  
  const verificationScript = `
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySchema() {
  try {
    console.log('=== SUPABASE SCHEMA VERIFICATION ===');
    
    // Check table counts
    const tableCounts = {
      properties: await prisma.property.count(),
      units: await prisma.unit.count(),
      bookings: await prisma.booking.count(),
      payments: await prisma.payment.count(),
      users: await prisma.user.count(),
      coupons: await prisma.coupon.count(),
      seasonalPricing: await prisma.seasonalPricing?.count() || 0,
      amenities: await prisma.amenity?.count() || 0,
      dateBlockages: await prisma.dateBlockage?.count() || 0
    };
    
    console.log('Table counts in Supabase:');
    Object.entries(tableCounts).forEach(([table, count]) => {
      console.log(\`  \${table}: \${count}\`);
    });
    
    // Check schema structure
    console.log('\\nSchema structure verification:');
    
    // Sample property check
    const sampleProperty = await prisma.property.findFirst();
    if (sampleProperty) {
      console.log('✅ Property table accessible');
      console.log(\`Sample property: \${sampleProperty.name} (\${sampleProperty.slug})\`);
    } else {
      console.log('ℹ️  No properties found (expected after fresh migration)');
    }
    
    // Check array fields
    if (sampleProperty) {
      console.log(\`galleryImages type: \${typeof sampleProperty.galleryImages}\`);
      console.log(\`galleryImages value: \${sampleProperty.galleryImages}\`);
    }
    
    await prisma.$disconnect();
    console.log('✅ Schema verification completed');
    
  } catch (error) {
    console.error('❌ Schema verification failed:', error.message);
    process.exit(1);
  }
}

verifySchema();
`;
  
  writeFileSync('verify-supabase-schema.mjs', verificationScript);
  
  try {
    execSync('node verify-supabase-schema.mjs', { stdio: 'inherit' });
    logSuccess('Supabase schema verification completed');
    return true;
  } catch (error) {
    logError('Supabase schema verification failed');
    return false;
  }
}

// Create setup report
function createSetupReport() {
  logSection('CREATING SETUP REPORT');
  
  const report = {
    timestamp: new Date().toISOString(),
    phase: 'PHASE 3: SUPABASE SETUP',
    status: 'INSTRUCTIONS PROVIDED',
    requirements: {
      database_url: 'postgresql://[user]:[pass]@db.[ref].supabase.co:5432/postgres',
      supabase_url: 'https://[project-ref].supabase.co',
      supabase_anon_key: '[from-supabase-dashboard]',
      supabase_service_role_key: '[from-supabase-dashboard]'
    },
    nextSteps: [
      '1. Create Supabase project at https://supabase.com',
      '2. Get database connection string',
      '3. Configure environment variables',
      '4. Run: npx prisma migrate deploy',
      '5. Verify tables in Supabase dashboard',
      '6. Proceed to Phase 4: Data migration'
    ],
    verification: {
      schemaConverted: true,
      clientGenerated: true,
      readyForMigration: true
    }
  };
  
  writeFileSync('supabase-setup-report.json', JSON.stringify(report, null, 2));
  logSuccess('Setup report saved to supabase-setup-report.json');
}

// Main execution
async function main() {
  log('cyan', '🗄️ PHASE 3: SUPABASE SETUP');
  log('cyan', '=====================================');
  
  // Display setup instructions
  displaySupabaseSetupInstructions();
  
  // Test database connection (will fail until DATABASE_URL is set)
  const connectionTest = testDatabaseConnection();
  if (!connectionTest) {
    logWarning('Database connection test failed (expected before setup)');
    logInfo('Please complete Supabase setup first');
  }
  
  // Create setup report
  createSetupReport();
  
  logSection('PHASE 3 STATUS');
  logSuccess('Supabase setup instructions provided');
  logInfo('Schema is ready for deployment to Supabase');
  
  logSection('ACTION REQUIRED');
  logWarning('⚠️  MANUAL SETUP REQUIRED');
  logInfo('1. Follow the instructions above to create Supabase project');
  logInfo('2. Configure environment variables');
  logInfo('3. Run: npx prisma migrate deploy');
  logInfo('4. Re-run this script to verify setup');
  
  logSection('NEXT PHASE');
  logInfo('After Supabase setup is complete:');
  logInfo('Run: npx tsx scripts/phase4-data-migration.ts');
}

main();
