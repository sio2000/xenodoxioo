
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
    console.log('\n--- DATABASE CONNECTION TEST ---');
    
    // Test Prisma connection
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ Prisma database connection: SUCCESS');
    
    // Get database info
    const result = await prisma.$queryRaw`SELECT version()` as any;
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
    console.log('\n--- DATA VERIFICATION ---');
    
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
  console.log('\n--- STRIPE CONFIGURATION ---');
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
  console.log('\n--- ENVIRONMENT VARIABLES ---');
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
        console.log(`✅ ${varName}: ${value.substring(0, 8)}...`);
      } else {
        console.log(`✅ ${varName}: ${value}`);
      }
    } else {
      console.log(`❌ ${varName}: MISSING`);
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
