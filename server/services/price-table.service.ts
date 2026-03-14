/**
 * Price Table Service
 * Reads and parses Πίνακας Τιμών Δωματίων.txt - the source of truth for room pricing.
 * All prices are per day (ανά ημέρα).
 */

import * as fs from "fs";
import * as path from "path";

// ── Types ────────────────────────────────────────────────────────────

export interface PeriodPrice {
  /** Fixed price (when no guest tiers) */
  price?: number;
  /** Price for 10 guests */
  price10?: number;
  /** Price for 6 guests */
  price6?: number;
  /** Room is closed for this period */
  closed?: boolean;
}

export interface RoomPeriod {
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  /** True if period spans year boundary (e.g. 20/12 – 07/01) */
  spansYear: boolean;
  price: PeriodPrice;
}

export interface RoomPricing {
  roomName: string;
  /** Normalized name for matching (lowercase, trimmed) */
  normalizedName: string;
  periods: RoomPeriod[];
}

export interface ParsedPriceTable {
  rooms: RoomPricing[];
  /** All unique periods in order (for admin display) */
  allPeriods: Array<{ startMonth: number; startDay: number; endMonth: number; endDay: number; spansYear: boolean; label: string }>;
}

// ── File path ────────────────────────────────────────────────────────

const PRICE_TABLE_FILENAME = "Πίνακας Τιμών Δωματίων.txt";

function getPriceTablePath(): string {
  // Project root is typically process.cwd() or __dirname/../..
  const candidates = [
    path.join(process.cwd(), PRICE_TABLE_FILENAME),
    path.join(__dirname, "..", "..", PRICE_TABLE_FILENAME),
    path.join(__dirname, "..", "..", "..", PRICE_TABLE_FILENAME),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`Price table file not found: ${PRICE_TABLE_FILENAME}. Tried: ${candidates.join(", ")}`);
}

// ── Parse period string (e.g. "20/12 – 07/01" or "01/06 – 30/06") ────

function parsePeriodRange(rangeStr: string): { startMonth: number; startDay: number; endMonth: number; endDay: number; spansYear: boolean } {
  const match = rangeStr.match(/(\d{1,2})\/(\d{1,2})\s*[–\-]\s*(\d{1,2})\/(\d{1,2})/);
  if (!match) throw new Error(`Invalid period format: ${rangeStr}`);
  const startDay = parseInt(match[1], 10);
  const startMonth = parseInt(match[2], 10);
  const endDay = parseInt(match[3], 10);
  const endMonth = parseInt(match[4], 10);
  const spansYear = startMonth > endMonth; // e.g. 12 > 1
  return { startMonth, startDay, endMonth, endDay, spansYear };
}

// ── Parse price string ──────────────────────────────────────────────

function parsePriceString(priceStr: string): PeriodPrice {
  const trimmed = priceStr.trim();
  if (/κλειστό|closed/i.test(trimmed)) {
    return { closed: true };
  }

  // Match: 380€ (10 επισκέπτες) / 320€ (6 επισκέπτες)
  const guestMatch = trimmed.match(/(\d+)\s*€?\s*\(10\s*επισκέπτες\)\s*\/\s*(\d+)\s*€?\s*\(6\s*επισκέπτες\)/i);
  if (guestMatch) {
    return {
      price10: parseInt(guestMatch[1], 10),
      price6: parseInt(guestMatch[2], 10),
    };
  }

  // Match: 140€ or 140 €
  const simpleMatch = trimmed.match(/(\d+)\s*€?/);
  if (simpleMatch) {
    return { price: parseInt(simpleMatch[1], 10) };
  }

  throw new Error(`Could not parse price: ${priceStr}`);
}

// ── Check if date (month, day) falls in period ────────────────────────

function dateInPeriod(month: number, day: number, period: RoomPeriod): boolean {
  if (period.spansYear) {
    // e.g. 20/12 – 07/01: (Dec 20–31) or (Jan 1–7)
    return (
      (month === period.startMonth && day >= period.startDay) ||
      (month === period.endMonth && day <= period.endDay)
    );
  }
  // Same-year period
  if (month < period.startMonth || month > period.endMonth) return false;
  if (month === period.startMonth && day < period.startDay) return false;
  if (month === period.endMonth && day > period.endDay) return false;
  return true;
}

// ── Main parser ──────────────────────────────────────────────────────

let cachedTable: ParsedPriceTable | null = null;

export function parsePriceTable(): ParsedPriceTable {
  if (cachedTable) return cachedTable;

  const filePath = getPriceTablePath();
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);

  const rooms: RoomPricing[] = [];
  const allPeriodsMap = new Map<string, { startMonth: number; startDay: number; endMonth: number; endDay: number; spansYear: boolean; label: string }>();

  let i = 0;
  while (i < lines.length) {
    // Skip header line
    if (lines[i].includes("Πίνακας Τιμών") || lines[i].includes("Τιμές ανά ημέρα")) {
      i++;
      continue;
    }

    // Room name (no "Περίοδος" and no tab)
    const roomName = lines[i];
    if (!roomName || roomName === "Περίοδος" || roomName.includes("\t")) {
      i++;
      continue;
    }
    i++;

    // Skip "Περίοδος	Τιμή (ανά ημέρα)" line
    if (i < lines.length && lines[i].includes("Περίοδος")) {
      i++;
    }

    const periods: RoomPeriod[] = [];
    while (i < lines.length) {
      const line = lines[i];
      if (!line || !line.includes("\t")) break;
      const [rangePart, pricePart] = line.split("\t").map((s) => s.trim());
      if (!rangePart || !pricePart) break;

      const { startMonth, startDay, endMonth, endDay, spansYear } = parsePeriodRange(rangePart);
      const price = parsePriceString(pricePart);

      const period: RoomPeriod = {
        startMonth,
        startDay,
        endMonth,
        endDay,
        spansYear,
        price,
      };
      periods.push(period);

      const periodKey = `${startMonth}/${startDay}-${endMonth}/${endDay}`;
      if (!allPeriodsMap.has(periodKey)) {
        allPeriodsMap.set(periodKey, {
          startMonth,
          startDay,
          endMonth,
          endDay,
          spansYear,
          label: rangePart,
        });
      }
      i++;
    }

    const normalizedName = roomName.toLowerCase().trim();
    rooms.push({
      roomName,
      normalizedName,
      periods,
    });
  }

  // Sort periods for display (by start month/day)
  const allPeriods = Array.from(allPeriodsMap.values()).sort((a, b) => {
    if (a.spansYear && !b.spansYear) return 1;
    if (!a.spansYear && b.spansYear) return -1;
    if (a.startMonth !== b.startMonth) return a.startMonth - b.startMonth;
    return a.startDay - b.startDay;
  });

  cachedTable = { rooms, allPeriods };
  return cachedTable;
}

// ── Invalidate cache (e.g. when file changes) ──────────────────────────

export function invalidatePriceTableCache(): void {
  cachedTable = null;
}

// ── Get price for a specific date and room ───────────────────────────

/**
 * Returns the price per day for the given room, date, and guest count.
 * For rooms with guest tiers: use price6 if guests <= 6, else price10.
 * Throws if room is closed or not found.
 */
export function getPriceForDate(
  unitName: string,
  date: Date,
  guests: number,
): { pricePerDay: number; periodLabel: string } {
  const table = parsePriceTable();
  const normalized = unitName.toLowerCase().trim();

  const room = table.rooms.find(
    (r) =>
      r.normalizedName === normalized ||
      r.roomName.toLowerCase() === normalized ||
      normalized.includes(r.normalizedName) ||
      r.normalizedName.includes(normalized),
  );

  if (!room) {
    throw new Error(`Room not found in price table: ${unitName}`);
  }

  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  for (const period of room.periods) {
    if (!dateInPeriod(month, day, period)) continue;

    const p = period.price;
    if (p.closed) {
      throw new Error(`Room ${room.roomName} is closed for this period`);
    }

    let pricePerDay: number;
    if (p.price !== undefined) {
      pricePerDay = p.price;
    } else if (p.price6 !== undefined && p.price10 !== undefined) {
      pricePerDay = guests <= 6 ? p.price6 : p.price10;
    } else {
      throw new Error(`Invalid price config for ${room.roomName}`);
    }

    const periodLabel = `${String(period.startDay).padStart(2, "0")}/${String(period.startMonth).padStart(2, "0")} – ${String(period.endDay).padStart(2, "0")}/${String(period.endMonth).padStart(2, "0")}`;
    return { pricePerDay, periodLabel };
  }

  throw new Error(`No period found for date ${date.toISOString()} in room ${room.roomName}`);
}

// ── Check if room is closed for a date ─────────────────────────────────

export function isRoomClosedForDate(unitName: string, date: Date): boolean {
  try {
    getPriceForDate(unitName, date, 1);
    return false;
  } catch (e: any) {
    return e?.message?.includes("closed") ?? false;
  }
}

// ── Check if room is closed for any night in date range ─────────────────

export function isRoomClosedForDateRange(unitName: string, checkIn: Date, checkOut: Date): boolean {
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const y = checkIn.getUTCFullYear();
  const m = checkIn.getUTCMonth();
  const d = checkIn.getUTCDate();
  for (let i = 0; i < nights; i++) {
    const current = new Date(Date.UTC(y, m, d + i, 12, 0, 0));
    if (isRoomClosedForDate(unitName, current)) return true;
  }
  return false;
}

// ── Calculate total price for a date range (handles multi-period) ──────

/**
 * Calculates total price for a booking that may span multiple periods.
 * Each night is priced according to its own date.
 */
export function calculateTotalForDateRange(
  unitName: string,
  checkIn: Date,
  checkOut: Date,
  guests: number,
): { totalPrice: number; nights: number; pricePerDayUsed?: number } {
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  if (nights <= 0) throw new Error("Invalid date range");

  let total = 0;
  const y = checkIn.getUTCFullYear();
  const m = checkIn.getUTCMonth();
  const d = checkIn.getUTCDate();

  for (let i = 0; i < nights; i++) {
    const current = new Date(Date.UTC(y, m, d + i, 12, 0, 0));
    const { pricePerDay } = getPriceForDate(unitName, current, guests);
    total += pricePerDay;
  }

  return {
    totalPrice: total,
    nights,
    pricePerDayUsed: nights === 1 ? undefined : total / nights,
  };
}

// ── Get current period (for admin) ────────────────────────────────────

function isDateInPeriod(
  month: number,
  day: number,
  p: { startMonth: number; startDay: number; endMonth: number; endDay: number; spansYear: boolean },
): boolean {
  if (p.spansYear) {
    return (month === p.startMonth && day >= p.startDay) || (month === p.endMonth && day <= p.endDay);
  }
  if (month < p.startMonth || month > p.endMonth) return false;
  if (month === p.startMonth && day < p.startDay) return false;
  if (month === p.endMonth && day > p.endDay) return false;
  return true;
}

export function getCurrentPeriod(): {
  period: { startMonth: number; startDay: number; endMonth: number; endDay: number; spansYear: boolean; label: string };
  roomPrices: Array<{
    roomName: string;
    closed: boolean;
    price?: number;
    price6?: number;
    price10?: number;
  }>;
} | null {
  const table = parsePriceTable();
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  for (const p of table.allPeriods) {
    if (!isDateInPeriod(month, day, p)) continue;

    const roomPrices = table.rooms.map((r) => {
      const period = r.periods.find((pr) => dateInPeriod(month, day, pr));
      if (!period) return { roomName: r.roomName, closed: true };
      const px = period.price;
      if (px?.closed) return { roomName: r.roomName, closed: true };
      return {
        roomName: r.roomName,
        closed: false,
        price: px?.price,
        price6: px?.price6,
        price10: px?.price10,
      };
    });
    const label = `${String(p.startDay).padStart(2, "0")}/${String(p.startMonth).padStart(2, "0")} – ${String(p.endDay).padStart(2, "0")}/${String(p.endMonth).padStart(2, "0")}`;
    return { period: { ...p, label }, roomPrices };
  }
  return null;
}

// ── Get minimum price for room (for display / "starting from") ─────────

export function getMinimumPriceForRoom(unitName: string): number | null {
  const table = parsePriceTable();
  const normalized = unitName.toLowerCase().trim();
  const room = table.rooms.find(
    (r) =>
      r.normalizedName === normalized ||
      r.roomName.toLowerCase() === normalized ||
      normalized.includes(r.normalizedName) ||
      r.normalizedName.includes(normalized),
  );
  if (!room) return null;
  let minPrice: number | null = null;
  for (const period of room.periods) {
    const p = period.price;
    if (p.closed) continue;
    const price = p.price ?? Math.min(p.price6 ?? Infinity, p.price10 ?? Infinity);
    if (price < Infinity && (minPrice === null || price < minPrice)) minPrice = price;
  }
  return minPrice;
}

// ── Get closed status and next reopen date for a room ────────────────────

/**
 * Returns whether the room is closed today and the date it reopens (first day of next open period).
 */
export function getRoomClosedStatusAndReopenDate(
  unitName: string,
  refDate: Date = new Date(),
): { closed: boolean; reopenDate: string | null } {
  const table = parsePriceTable();
  const normalized = unitName.toLowerCase().trim();
  const room = table.rooms.find(
    (r) =>
      r.normalizedName === normalized ||
      r.roomName.toLowerCase() === normalized ||
      normalized.includes(r.normalizedName) ||
      r.normalizedName.includes(normalized),
  );
  if (!room) return { closed: false, reopenDate: null };

  const m = refDate.getMonth() + 1;
  const d = refDate.getDate();
  const year = refDate.getFullYear();

  // Build list of (sortKey, startMonth, startDay, endMonth, endDay, closed) for ordering
  type PeriodInfo = { sortKey: number; startM: number; startD: number; endM: number; endD: number; closed: boolean };
  const periodInfos: PeriodInfo[] = room.periods.map((pr) => {
    const closed = pr.price?.closed ?? false;
    let sortKey: number;
    if (pr.spansYear) {
      sortKey = pr.startMonth * 100 + pr.startDay; // Dec 20 = 1220, sorts late
    } else {
      sortKey = pr.startMonth * 100 + pr.startDay;
    }
    return {
      sortKey,
      startM: pr.startMonth,
      startD: pr.startDay,
      endM: pr.endMonth,
      endD: pr.endDay,
      closed,
    };
  });

  // Sort by start date (Jan 8 < Jun 1 < ... < Dec 20)
  periodInfos.sort((a, b) => a.sortKey - b.sortKey);

  // Find which period contains (m, d)
  function inPeriod(mm: number, dd: number, p: PeriodInfo): boolean {
    if (p.startM > p.endM) {
      return (mm === p.startM && dd >= p.startD) || (mm === p.endM && dd <= p.endD);
    }
    if (mm < p.startM || mm > p.endM) return false;
    if (mm === p.startM && dd < p.startD) return false;
    if (mm === p.endM && dd > p.endD) return false;
    return true;
  }

  const currentIdx = periodInfos.findIndex((p) => inPeriod(m, d, p));
  if (currentIdx < 0) return { closed: false, reopenDate: null };
  const current = periodInfos[currentIdx];
  if (!current.closed) return { closed: false, reopenDate: null };

  // Find next open period (wrap around year)
  for (let i = 1; i <= periodInfos.length; i++) {
    const idx = (currentIdx + i) % periodInfos.length;
    const next = periodInfos[idx];
    if (!next.closed) {
      const reopenYear = idx < currentIdx ? year + 1 : year;
      const reopenDate = `${reopenYear}-${String(next.startM).padStart(2, "0")}-${String(next.startD).padStart(2, "0")}`;
      return { closed: true, reopenDate };
    }
  }
  return { closed: true, reopenDate: null };
}

// ── Get upcoming periods (for admin) ───────────────────────────────────

export function getUpcomingPeriods(): Array<{ label: string; startMonth: number; startDay: number; endMonth: number; endDay: number }> {
  const table = parsePriceTable();
  const current = getCurrentPeriod();
  const currentLabel = current?.period.label;

  return table.allPeriods
    .filter((p) => {
      const label = `${String(p.startDay).padStart(2, "0")}/${String(p.startMonth).padStart(2, "0")} – ${String(p.endDay).padStart(2, "0")}/${String(p.endMonth).padStart(2, "0")}`;
      return label !== currentLabel;
    })
    .map((p) => ({
      label: `${String(p.startDay).padStart(2, "0")}/${String(p.startMonth).padStart(2, "0")} – ${String(p.endDay).padStart(2, "0")}/${String(p.endMonth).padStart(2, "0")}`,
      startMonth: p.startMonth,
      startDay: p.startDay,
      endMonth: p.endMonth,
      endDay: p.endDay,
    }));
}
