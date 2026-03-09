#!/usr/bin/env node
/**
 * PHASE 7 (Dashboard fallback): Generate SQL to compare baseline numeric pricing
 * against live Supabase tables from inside Supabase SQL Editor.
 *
 * Output: supabase-phase7-pricing-compare.sql
 */

import { readFileSync, writeFileSync, existsSync } from "fs";

type Baseline = {
  timestamp?: string;
  data?: {
    unit?: Array<{ id: string; slug?: string; basePrice: number; cleaningFee: number }>;
    booking?: Array<{
      id: string;
      bookingNumber: string;
      basePrice: number;
      subtotal: number;
      cleaningFee: number;
      taxes: number;
      discountAmount: number;
      depositAmount: number;
      balanceAmount: number;
      totalPrice: number;
    }>;
    coupon?: Array<{ id: string; code: string; discountType: string; discountValue: number }>;
  };
};

const BASELINE_PATH = "migration-baseline-snapshot.json";
const OUT_PATH = "supabase-phase7-pricing-compare.sql";
const TOL = 0.001;

function sqlString(s: string): string {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function sqlNum(n: unknown): string {
  if (n === null || n === undefined || n === "") return "NULL";
  const v = Number(n);
  if (!Number.isFinite(v)) return "NULL";
  // Keep full precision; Postgres will parse it as numeric/float
  return String(v);
}

function valuesBlock(rows: string[]): string {
  if (rows.length === 0) return "VALUES (NULL)";
  return `VALUES\n  ${rows.join(",\n  ")}`;
}

function main() {
  if (!existsSync(BASELINE_PATH)) {
    console.error(`Baseline not found: ${BASELINE_PATH}`);
    process.exit(1);
  }

  const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Baseline;
  const ts = baseline.timestamp ?? "unknown";

  const units = baseline.data?.unit ?? [];
  const bookings = baseline.data?.booking ?? [];
  const coupons = baseline.data?.coupon ?? [];

  // Compare by stable business keys (slug / bookingNumber / code), not by IDs,
  // because Supabase may use UUIDs while baseline uses cuid().
  const unitRows = units
    .filter((u) => typeof u.slug === "string" && u.slug.length > 0)
    .map((u) => `(${sqlString(u.slug!)}, ${sqlNum(u.basePrice)}, ${sqlNum(u.cleaningFee)})`);

  const bookingRows = bookings.map(
    (b) =>
      `(${sqlString(b.bookingNumber)}, ${sqlNum(b.basePrice)}, ${sqlNum(b.subtotal)}, ${sqlNum(
        b.cleaningFee
      )}, ${sqlNum(b.taxes)}, ${sqlNum(b.discountAmount)}, ${sqlNum(b.depositAmount)}, ${sqlNum(
        b.balanceAmount
      )}, ${sqlNum(b.totalPrice)})`
  );

  const couponRows = coupons.map(
    (c) =>
      `(${sqlString(c.code)}, ${sqlString(c.discountType)}, ${sqlNum(c.discountValue)})`
  );

  const sql = `-- PHASE 7: Pricing lock verification (Supabase SQL Editor)
-- Generated from ${BASELINE_PATH} (timestamp: ${ts})
-- Tolerance: ${TOL}
--
-- Targets Supabase snake_case tables:
--   public.units / public.bookings / public.coupons
--
-- Comparisons:
--   Unit: slug
--   Booking: booking_number
--   Coupon: code

-- 1) UNIT PRICING PARITY (counts)
WITH baseline_unit(slug, base_price, cleaning_fee) AS (
  ${valuesBlock(unitRows)}
),
live_unit AS (
  SELECT slug, base_price::double precision AS base_price, cleaning_fee::double precision AS cleaning_fee
  FROM public.units
),
diff AS (
  SELECT
    b.slug,
    b.base_price AS baseline_base_price,
    l.base_price AS live_base_price,
    (l.base_price - b.base_price) AS base_price_diff,
    b.cleaning_fee AS baseline_cleaning_fee,
    l.cleaning_fee AS live_cleaning_fee,
    (l.cleaning_fee - b.cleaning_fee) AS cleaning_fee_diff
  FROM baseline_unit b
  LEFT JOIN live_unit l USING (slug)
)
SELECT
  'unit_mismatches' AS check_name,
  COUNT(*) FILTER (
    WHERE live_base_price IS NULL
       OR ABS(COALESCE(base_price_diff, 0)) > ${TOL}
       OR ABS(COALESCE(cleaning_fee_diff, 0)) > ${TOL}
  ) AS mismatches,
  COUNT(*) AS baseline_rows
FROM diff;

-- Unit mismatches (details)
WITH baseline_unit(slug, base_price, cleaning_fee) AS (
  ${valuesBlock(unitRows)}
),
live_unit AS (
  SELECT slug, base_price::double precision AS base_price, cleaning_fee::double precision AS cleaning_fee
  FROM public.units
)
SELECT
  b.slug,
  b.base_price AS baseline_base_price,
  l.base_price AS live_base_price,
  (l.base_price - b.base_price) AS base_price_diff,
  b.cleaning_fee AS baseline_cleaning_fee,
  l.cleaning_fee AS live_cleaning_fee,
  (l.cleaning_fee - b.cleaning_fee) AS cleaning_fee_diff
FROM baseline_unit b
LEFT JOIN live_unit l USING (slug)
WHERE l.slug IS NULL
   OR ABS(COALESCE(l.base_price - b.base_price, 0)) > ${TOL}
   OR ABS(COALESCE(l.cleaning_fee - b.cleaning_fee, 0)) > ${TOL}
ORDER BY b.slug;

-- 2) BOOKING PRICING PARITY (counts)
WITH baseline_booking(
  booking_number, base_price, subtotal, cleaning_fee, taxes, discount_amount, deposit_amount, balance_amount, total_price
) AS (
  ${valuesBlock(bookingRows)}
),
live_booking AS (
  SELECT
    booking_number,
    base_price::double precision AS base_price,
    subtotal::double precision AS subtotal,
    cleaning_fee::double precision AS cleaning_fee,
    taxes::double precision AS taxes,
    discount_amount::double precision AS discount_amount,
    deposit_amount::double precision AS deposit_amount,
    balance_amount::double precision AS balance_amount,
    total_price::double precision AS total_price
  FROM public.bookings
),
diff AS (
  SELECT
    b.booking_number,
    l.booking_number AS live_booking_number,
    (l.base_price - b.base_price) AS base_price_diff,
    (l.subtotal - b.subtotal) AS subtotal_diff,
    (l.cleaning_fee - b.cleaning_fee) AS cleaning_fee_diff,
    (l.taxes - b.taxes) AS taxes_diff,
    (l.discount_amount - b.discount_amount) AS discount_amount_diff,
    (l.deposit_amount - b.deposit_amount) AS deposit_amount_diff,
    (l.balance_amount - b.balance_amount) AS balance_amount_diff,
    (l.total_price - b.total_price) AS total_price_diff
  FROM baseline_booking b
  LEFT JOIN live_booking l USING (booking_number)
)
SELECT
  'booking_mismatches' AS check_name,
  COUNT(*) FILTER (
    WHERE live_booking_number IS NULL
       OR ABS(COALESCE(base_price_diff, 0)) > ${TOL}
       OR ABS(COALESCE(subtotal_diff, 0)) > ${TOL}
       OR ABS(COALESCE(cleaning_fee_diff, 0)) > ${TOL}
       OR ABS(COALESCE(taxes_diff, 0)) > ${TOL}
       OR ABS(COALESCE(discount_amount_diff, 0)) > ${TOL}
       OR ABS(COALESCE(deposit_amount_diff, 0)) > ${TOL}
       OR ABS(COALESCE(balance_amount_diff, 0)) > ${TOL}
       OR ABS(COALESCE(total_price_diff, 0)) > ${TOL}
  ) AS mismatches,
  COUNT(*) AS baseline_rows
FROM diff;

-- Booking mismatches (details)
WITH baseline_booking(
  booking_number, base_price, subtotal, cleaning_fee, taxes, discount_amount, deposit_amount, balance_amount, total_price
) AS (
  ${valuesBlock(bookingRows)}
),
live_booking AS (
  SELECT
    booking_number,
    base_price::double precision AS base_price,
    subtotal::double precision AS subtotal,
    cleaning_fee::double precision AS cleaning_fee,
    taxes::double precision AS taxes,
    discount_amount::double precision AS discount_amount,
    deposit_amount::double precision AS deposit_amount,
    balance_amount::double precision AS balance_amount,
    total_price::double precision AS total_price
  FROM public.bookings
)
SELECT
  b.booking_number,
  b.total_price AS baseline_total_price,
  l.total_price AS live_total_price,
  (l.total_price - b.total_price) AS total_price_diff,
  b.subtotal AS baseline_subtotal,
  l.subtotal AS live_subtotal,
  (l.subtotal - b.subtotal) AS subtotal_diff
FROM baseline_booking b
LEFT JOIN live_booking l USING (booking_number)
WHERE l.booking_number IS NULL
   OR ABS(COALESCE(l.base_price - b.base_price, 0)) > ${TOL}
   OR ABS(COALESCE(l.subtotal - b.subtotal, 0)) > ${TOL}
   OR ABS(COALESCE(l.cleaning_fee - b.cleaning_fee, 0)) > ${TOL}
   OR ABS(COALESCE(l.taxes - b.taxes, 0)) > ${TOL}
   OR ABS(COALESCE(l.discount_amount - b.discount_amount, 0)) > ${TOL}
   OR ABS(COALESCE(l.deposit_amount - b.deposit_amount, 0)) > ${TOL}
   OR ABS(COALESCE(l.balance_amount - b.balance_amount, 0)) > ${TOL}
   OR ABS(COALESCE(l.total_price - b.total_price, 0)) > ${TOL}
ORDER BY b.booking_number;

-- 3) COUPON VALUES (counts)
WITH baseline_coupon(code, discount_type, discount_value) AS (
  ${valuesBlock(couponRows)}
),
live_coupon AS (
  SELECT
    code,
    discount_type::text AS discount_type,
    discount_value::double precision AS discount_value
  FROM public.coupons
),
diff AS (
  SELECT
    b.code,
    l.code AS live_code,
    b.discount_type AS baseline_discount_type,
    l.discount_type AS live_discount_type,
    b.discount_value AS baseline_discount_value,
    l.discount_value AS live_discount_value,
    (l.discount_value - b.discount_value) AS discount_value_diff
  FROM baseline_coupon b
  LEFT JOIN live_coupon l USING (code)
)
SELECT
  'coupon_mismatches' AS check_name,
  COUNT(*) FILTER (
    WHERE live_code IS NULL
       OR baseline_discount_type <> live_discount_type
       OR ABS(COALESCE(discount_value_diff, 0)) > ${TOL}
  ) AS mismatches,
  COUNT(*) AS baseline_rows
FROM diff;

-- Coupon mismatches (details)
WITH baseline_coupon(code, discount_type, discount_value) AS (
  ${valuesBlock(couponRows)}
),
live_coupon AS (
  SELECT
    code,
    discount_type::text AS discount_type,
    discount_value::double precision AS discount_value
  FROM public.coupons
)
SELECT
  b.code,
  b.discount_type AS baseline_discount_type,
  l.discount_type AS live_discount_type,
  b.discount_value AS baseline_discount_value,
  l.discount_value AS live_discount_value,
  (l.discount_value - b.discount_value) AS discount_value_diff
FROM baseline_coupon b
LEFT JOIN live_coupon l USING (code)
WHERE l.code IS NULL
   OR b.discount_type <> l.discount_type
   OR ABS(COALESCE(l.discount_value - b.discount_value, 0)) > ${TOL}
ORDER BY b.code;
`;

  writeFileSync(OUT_PATH, sql, "utf8");
  console.log(`✅ Generated ${OUT_PATH}`);
  console.log(`   Next: open Supabase SQL Editor and run the file contents.`);
}

main();

