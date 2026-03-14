/**
 * Client-side price tiers for Lykoskufi 5 & Ogra House.
 * Fallback when API quote fails. Prices: ≤6 guests = price6, 7-10 guests = price10.
 * Period format: { startM, startD, endM, endD, spansYear?, price6, price10 }
 */
type Period = { startM: number; startD: number; endM: number; endD: number; spansYear?: boolean; price6: number; price10: number };

const OGRA_PERIODS: Period[] = [
  { startM: 12, startD: 20, endM: 1, endD: 7, spansYear: true, price6: 220, price10: 250 },
  { startM: 1, startD: 8, endM: 5, endD: 31, price6: 200, price10: 220 },
  { startM: 6, startD: 1, endM: 6, endD: 30, price6: 220, price10: 250 },
  { startM: 7, startD: 1, endM: 8, endD: 31, price6: 250, price10: 280 },
  { startM: 9, startD: 1, endM: 9, endD: 30, price6: 220, price10: 250 },
  { startM: 10, startD: 1, endM: 12, endD: 19, price6: 200, price10: 220 },
];

const LYKOSKUFI5_PERIODS: Period[] = [
  { startM: 12, startD: 20, endM: 1, endD: 7, spansYear: true, price6: 320, price10: 380 },
  { startM: 1, startD: 8, endM: 5, endD: 31, price6: 300, price10: 350 },
  { startM: 6, startD: 1, endM: 6, endD: 30, price6: 320, price10: 380 },
  { startM: 7, startD: 1, endM: 8, endD: 31, price6: 350, price10: 420 },
  { startM: 9, startD: 1, endM: 9, endD: 30, price6: 320, price10: 380 },
  { startM: 10, startD: 1, endM: 12, endD: 19, price6: 300, price10: 350 },
];

function dateInPeriod(m: number, d: number, p: Period): boolean {
  if (p.spansYear) {
    return (m === p.startM && d >= p.startD) || (m === p.endM && d <= p.endD);
  }
  if (m < p.startM || m > p.endM) return false;
  if (m === p.startM && d < p.startD) return false;
  if (m === p.endM && d > p.endD) return false;
  return true;
}

function getPriceForDate(periods: Period[], date: Date, guests: number): number | null {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  for (const p of periods) {
    if (dateInPeriod(m, d, p)) {
      return guests <= 6 ? p.price6 : p.price10;
    }
  }
  return null;
}

export function getTieredPricePerNight(
  unitName: string,
  date: Date,
  guests: number,
): number | null {
  const name = (unitName || "").toLowerCase();
  const periods = name.includes("ogra") ? OGRA_PERIODS : name.includes("lykoskufi 5") ? LYKOSKUFI5_PERIODS : null;
  if (!periods) return null;
  return getPriceForDate(periods, date, guests);
}
