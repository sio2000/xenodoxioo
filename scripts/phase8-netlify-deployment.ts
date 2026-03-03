#!/usr/bin/env node
/**
 * PHASE 8: NETLIFY DEPLOYMENT PREP
 *
 * - Verifies production build
 * - Lists required environment variables for Netlify
 * - Outputs deployment checklist
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(color: string, msg: string) {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logSection(title: string) {
  log('cyan', `\n=== ${title} ===`);
}

const ENV_EXAMPLE = '.env.example';

const NETLIFY_ENV_VARS = {
  'Server / Build (required for SSR/API)': [
    'DATABASE_URL',
    'NODE_ENV',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ],
  'Optional server': [
    'API_URL',
    'FRONTEND_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL',
    'ADMIN_EMAIL',
    'SUPPORT_EMAIL',
    'BCRYPT_ROUNDS',
    'DEPOSIT_PERCENTAGE',
    'BALANCE_CHARGE_THRESHOLD_DAYS',
    'CURRENCY',
  ],
  'Client (VITE_ - baked at build time)': [
    'VITE_API_URL',
    'VITE_STRIPE_PUBLISHABLE_KEY',
  ],
};

async function main() {
  logSection('PHASE 8: NETLIFY DEPLOYMENT PREP');

  // 1. Build test
  logSection('1. Production build test');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: process.cwd() });
    log('green', '\n✅ Production build completed successfully.');
  } catch {
    log('red', '\n❌ Production build failed. Fix errors before deploying.');
    process.exit(1);
  }

  // 2. Env vars from .env.example
  logSection('2. Required environment variables (Netlify)');
  if (!existsSync(ENV_EXAMPLE)) {
    log('yellow', `⚠️  ${ENV_EXAMPLE} not found.`);
  } else {
    const content = readFileSync(ENV_EXAMPLE, 'utf8');
    for (const [group, vars] of Object.entries(NETLIFY_ENV_VARS)) {
      log('blue', `\n${group}:`);
      for (const v of vars) {
        const mentioned = content.includes(v);
        if (mentioned) log('green', `  • ${v}`);
        else log('yellow', `  • ${v} (add to .env.example if needed)`);
      }
    }
  }

  // 3. Checklist
  logSection('3. Netlify deployment checklist');
  log('blue', `
  □ In Netlify: Site settings → Environment variables
     - Add DATABASE_URL (Supabase connection string, direct/pooled)
     - Add JWT_SECRET, JWT_REFRESH_SECRET (strong random strings)
     - Add VITE_STRIPE_PUBLISHABLE_KEY if using Stripe on frontend
     - Add VITE_API_URL only if API runs elsewhere (e.g. Render); otherwise same origin

  □ Build command: npm run build  (or pnpm build)
  □ Publish directory: dist/spa  (if SPA-only) or per your netlify.toml

  □ If using Netlify Functions for API:
     - Ensure netlify.toml [build] functions = "netlify/functions"
     - Set all server-side env vars in Netlify (DATABASE_URL, JWT_*, STRIPE_*, etc.)

  □ After deploy: test login, property list, booking flow, and payments.
`);

  logSection('PHASE 8 RESULT');
  log('green', '🎉 NETLIFY DEPLOYMENT PREP COMPLETE');
  log('green', '   Build passed. Configure env vars in Netlify and deploy.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
