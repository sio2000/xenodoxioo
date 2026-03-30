#!/usr/bin/env node

/**
 * Script to generate Netlify environment variables for Supabase
 * Run this script to get the environment variables you need to set in Netlify
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Netlify Environment Variables Setup');
console.log('=====================================\n');

try {
  // Read local .env only (never committed). Do not point this at files tracked in git.
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Extract the required environment variables
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY', 
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NODE_ENV',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'ADMIN_EMAIL',
    'CURRENCY'
  ];
  
  const envVars = {};
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    const match = line.match(/^([^=]+)="([^"]*)"/);
    if (match && requiredVars.includes(match[1])) {
      envVars[match[1]] = match[2];
    }
  });
  
  console.log('📋 Copy these environment variables to your Netlify site settings:\n');
  console.log('Go to: Netlify Dashboard → Your Site → Site settings → Build & deploy → Environment\n');
  
  requiredVars.forEach(varName => {
    if (envVars[varName]) {
      console.log(`${varName}=${envVars[varName]}`);
    }
  });
  
  console.log('\n📝 Additional variables to set manually:');
  console.log('NODE_ENV=production');
  console.log('FRONTEND_URL=https://incredible-panda-05189b.netlify.app');
  
  console.log('\n🚀 After setting these variables:');
  console.log('1. Trigger a new deploy in Netlify');
  console.log('2. Your site will connect to Supabase instead of showing old data');
  console.log('3. The properties will show your current Supabase data');
  
} catch (error) {
  console.error('❌ Error reading environment file:', error.message);
  process.exit(1);
}
