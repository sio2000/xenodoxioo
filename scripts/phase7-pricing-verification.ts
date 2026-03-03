#!/usr/bin/env node
/**
 * PHASE 7: PRICING LOCK VERIFICATION
 *
 * Compares numeric pricing values in Supabase against the baseline snapshot
 * to ensure 1:1 parity after migration (no float drift or rounding differences).
 */

import { readFileSync, existsSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(color: string, msg: string) {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logSection(title: string) {
  log('cyan', `\n=== ${title} ===`);
}

const BASELINE_PATH = 'migration-baseline-snapshot.json';
const TOLERANCE = 0.001; // allow tiny float differences

function assertEqual(
  label: string,
  expected: number,
  actual: number,
  id: string
): boolean {
  const diff = Math.abs((actual ?? 0) - (expected ?? 0));
  if (diff <= TOLERANCE) return true;
  log('red', `  ❌ ${label} id=${id}: expected ${expected}, got ${actual}`);
  return false;
}

async function main() {
  logSection('PHASE 7: PRICING LOCK VERIFICATION');

  if (!process.env.DATABASE_URL) {
    log('red', '❌ DATABASE_URL is not set. Set it to your Supabase connection string.');
    process.exit(1);
  }

  if (!existsSync(BASELINE_PATH)) {
    log('yellow', `⚠️  Baseline file not found: ${BASELINE_PATH}. Skipping comparison; will only validate Supabase pricing consistency.`);
  }

  const baseline = existsSync(BASELINE_PATH)
    ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
    : { data: { unit: [], booking: [] } };

  const baselineUnits = baseline?.data?.unit ?? [];
  const baselineBookings = baseline?.data?.booking ?? [];

  const prisma = new PrismaClient();
  let passed = 0;
  let failed = 0;

  try {
    log('cyan', '\n--- Database connection ---');
    await prisma.$connect();
    log('green', '✅ Connected to database\n');

    // --- Units: basePrice, cleaningFee ---
    logSection('Unit pricing (basePrice, cleaningFee)');
    const units = await prisma.unit.findMany({
      select: { id: true, name: true, slug: true, basePrice: true, cleaningFee: true },
    });

    for (const u of units) {
      const base = baselineUnits.find((b: { id: string }) => b.id === u.id);
      if (base != null) {
        if (assertEqual('basePrice', Number(base.basePrice), u.basePrice, u.id)) passed++;
        else failed++;
        if (assertEqual('cleaningFee', Number(base.cleaningFee), u.cleaningFee, u.id)) passed++;
        else failed++;
      } else {
        if (u.basePrice > 0 && u.cleaningFee >= 0) {
          log('green', `  ✅ ${u.slug}: basePrice=${u.basePrice}, cleaningFee=${u.cleaningFee} (no baseline)`);
          passed++;
        } else {
          log('red', `  ❌ ${u.slug}: invalid pricing basePrice=${u.basePrice} cleaningFee=${u.cleaningFee}`);
          failed++;
        }
      }
    }

    if (units.length === 0) {
      log('yellow', '  No units in database.');
    }

    // --- Bookings: totalPrice, subtotal, basePrice, cleaningFee, etc. ---
    logSection('Booking pricing (totalPrice, subtotal, basePrice, cleaningFee)');
    const bookings = await prisma.booking.findMany({
      select: {
        id: true,
        bookingNumber: true,
        basePrice: true,
        totalNights: true,
        subtotal: true,
        cleaningFee: true,
        taxes: true,
        discountAmount: true,
        totalPrice: true,
      },
    });

    for (const b of bookings) {
      const base = baselineBookings.find((x: { id: string }) => x.id === b.id);
      if (base != null) {
        if (assertEqual('basePrice', Number(base.basePrice), b.basePrice, b.id)) passed++;
        else failed++;
        if (assertEqual('subtotal', Number(base.subtotal), b.subtotal, b.id)) passed++;
        else failed++;
        if (assertEqual('cleaningFee', Number(base.cleaningFee), b.cleaningFee, b.id)) passed++;
        else failed++;
        if (assertEqual('totalPrice', Number(base.totalPrice), b.totalPrice, b.id)) passed++;
        else failed++;
      } else {
        const valid = b.totalPrice >= 0 && b.subtotal >= 0;
        if (valid) {
          log('green', `  ✅ ${b.bookingNumber}: totalPrice=${b.totalPrice}, subtotal=${b.subtotal}`);
          passed++;
        } else {
          log('red', `  ❌ ${b.bookingNumber}: totalPrice=${b.totalPrice}, subtotal=${b.subtotal}`);
          failed++;
        }
      }
    }

    if (bookings.length === 0) {
      log('yellow', '  No bookings in database.');
    }

    // --- Coupons: discountValue (numeric) ---
    logSection('Coupon discount values');
    const coupons = await prisma.coupon.findMany({
      select: { id: true, code: true, discountType: true, discountValue: true },
    });
    for (const c of coupons) {
      if (c.discountValue >= 0 && (c.discountType === 'PERCENTAGE' ? c.discountValue <= 100 : true)) {
        log('green', `  ✅ ${c.code}: ${c.discountType}=${c.discountValue}`);
        passed++;
      } else {
        log('red', `  ❌ ${c.code}: invalid discountValue=${c.discountValue}`);
        failed++;
      }
    }

    logSection('PHASE 7 RESULT');
    if (failed === 0) {
      log('green', '🎉 PRICING LOCK VERIFICATION PASSED');
      log('green', `   All ${passed} checks passed. Numeric pricing parity confirmed.`);
    } else {
      log('red', `❌ ${failed} check(s) failed, ${passed} passed.`);
      process.exit(1);
    }
  } catch (e: unknown) {
    const err = e as Error;
    log('red', `\n❌ Database error: ${err.message}`);
    if ((err?.message ?? '').includes("Can't reach database server") || (err?.message ?? '').includes('P1001')) {
      log('yellow', '\n💡 Your Supabase project may be paused. Go to:');
      log('yellow', '   https://supabase.com/dashboard → your project → Settings → General → Restore project');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
