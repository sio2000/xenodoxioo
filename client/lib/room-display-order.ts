/**
 * Display order for rooms on home and /properties pages.
 * 1) Ogra house, 2) Lykoskufi 5, 3) Lykoskufi 2, 4) Lykoskufi 1,
 * 5) Big Bungalow, 6) Small Bungalow
 */
const ROOM_ORDER: Array<RegExp | string> = [
  /ogra/i,
  /lykoskufi\s*5|lykoskufi5/i,
  /lykoskufi\s*2|lykoskufi2/i,
  /lykoskufi\s*1|lykoskufi1/i,
  /big\s*bungalow|μεγάλο|megalo/i,
  /small\s*bungalow|μικρό|mikro/i,
];

function getSortIndex(name: string): number {
  const n = (name || "").trim();
  for (let i = 0; i < ROOM_ORDER.length; i++) {
    const pattern = ROOM_ORDER[i];
    if (typeof pattern === "string") {
      if (n.toLowerCase().includes(pattern.toLowerCase())) return i;
    } else if (pattern.test(n)) {
      return i;
    }
  }
  return ROOM_ORDER.length;
}

/** Sort items by room display order. Items without a match go at the end. */
export function sortByRoomOrder<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => getSortIndex(a.name) - getSortIndex(b.name));
}

/** Translation key for unit bed tags (property.bedTags.ograHouse, etc.). */
export function getUnitBedTagKey(propertyName: string, unitName: string): string | null {
  const n = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
  const p = n(propertyName ?? "");
  const u = n(unitName ?? "");
  const check = (key: string) => p.includes(key) || u.includes(key);

  if (check("ogra") || check("ogia")) return "property.bedTags.ograHouse";
  if (check("small") && check("bungalow")) return "property.bedTags.smallBungalow";
  if ((check("big") || check("large") || check("μεγάλο") || check("megalo")) && check("bungalow")) return "property.bedTags.bigBungalow";
  if (check("lykoskufi 5") || check("lykoski 5") || ((check("lykoskufi") || check("lykoski")) && u.includes("5"))) return "property.bedTags.lykoskufi5";
  if (check("lykoskufi 2") || check("lykoski 2") || ((check("lykoskufi") || check("lykoski")) && (u.includes("2") || u.includes("ii")))) return "property.bedTags.lykoskufi2";
  if (check("lykoskufi 1") || check("lykoski 1") || ((check("lykoskufi") || check("lykoski")) && (u.includes("1") || u.includes("i")))) return "property.bedTags.lykoskufi1";
  if (check("lykoskufi") || check("lykoski")) return "property.bedTags.lykoskufi1";
  return null;
}

const BED_TAG_INVENTORY_SEPARATOR = " · ";

/**
 * Splits bed tag copy so bedrooms can be shown first, then mattress/bed inventory.
 * Tags use "inventory · bedrooms" in all locale strings.
 */
export function getUnitBedDisplay(
  translate: (key: string) => string,
  bedTagKey: string | null,
  bedroomCount: number,
): { bedroomsLine: string; inventoryLine: string | null } {
  const bedroomsFromCount = translate("property.quickInfo.bedrooms").replace(
    "{n}",
    String(bedroomCount),
  );
  if (!bedTagKey) {
    return { bedroomsLine: bedroomsFromCount, inventoryLine: null };
  }
  const full = translate(bedTagKey);
  const idx = full.indexOf(BED_TAG_INVENTORY_SEPARATOR);
  if (idx === -1) {
    return { bedroomsLine: bedroomsFromCount, inventoryLine: full.trim() || null };
  }
  const inventory = full.slice(0, idx).trim();
  const bedrooms = full.slice(idx + BED_TAG_INVENTORY_SEPARATOR.length).trim();
  return {
    bedroomsLine: bedrooms || bedroomsFromCount,
    inventoryLine: inventory || null,
  };
}

/** Translation key for unit card blurbs (property.unitDesc.ograHouse, etc.). */
export function getUnitDescriptionKey(propertyName: string, unitName: string): string | null {
  const n = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
  const p = n(propertyName ?? "");
  const u = n(unitName ?? "");
  const check = (key: string) => p.includes(key) || u.includes(key);

  if (check("ogra") || check("ogia")) return "property.unitDesc.ograHouse";
  if (check("small") && check("bungalow")) return "property.unitDesc.smallBungalow";
  if ((check("big") || check("large") || check("μεγάλο") || check("megalo")) && check("bungalow")) return "property.unitDesc.bigBungalow";
  if (check("lykoskufi 5") || check("lykoski 5") || ((check("lykoskufi") || check("lykoski")) && u.includes("5"))) return "property.unitDesc.lykoskufi5";
  if (check("lykoskufi 2") || check("lykoski 2") || ((check("lykoskufi") || check("lykoski")) && (u.includes("2") || u.includes("ii")))) return "property.unitDesc.lykoskufi2";
  if (check("lykoskufi 1") || check("lykoski 1") || ((check("lykoskufi") || check("lykoski")) && (u.includes("1") || u.includes("i")))) return "property.unitDesc.lykoskufi1";
  if (check("lykoskufi") || check("lykoski")) return "property.unitDesc.lykoskufi1";
  return null;
}

/** Shown title override (e.g. branding). Returns translation key or null. */
export function getUnitDisplayTitleKey(unitName: string): string | null {
  const u = (unitName || "").toLowerCase().trim();
  if (/ogra/i.test(u)) return "property.unitTitle.ograHouse";
  return null;
}

/** Max guests per unit override. Returns number or null to use API/DB value. */
export function getMaxGuestsForUnit(unitName: string): number | null {
  const u = (unitName || "").toLowerCase().trim().replace(/\s+/g, " ");
  if (/small\s*bungalow/i.test(u)) return 3;
  if ((/big\s*bungalow|μεγάλο|megalo/i.test(u)) && /bungalow/i.test(u)) return 4;
  if (/lykoskufi\s*1|lykoskufi1|lykoski\s*1/i.test(u)) return 2;
  if (/lykoskufi\s*2|lykoskufi2|lykoski\s*2/i.test(u)) return 5;
  return null;
}

/** Big Bungalow – matches unit/property naming (excludes Small Bungalow). */
export function isBigBungalowUnit(unitName: string, propertyName = ""): boolean {
  const n = (s: string) => (s || "").toLowerCase().trim().replace(/\s+/g, " ");
  const u = n(unitName);
  const p = n(propertyName);
  if (!/bungalow/.test(`${u} ${p}`)) return false;
  if (/\bsmall\s*bungalow\b|μικρό|mikro/i.test(u)) return false;
  const big = (hay: string) =>
    hay.includes("big") || hay.includes("large") || hay.includes("μεγάλο") || hay.includes("megalo");
  return big(u) || big(p);
}

/** Nightly rate shown on listing/detail when Big Bungalow is in a booking-closed period. */
export const BIG_BUNGALOW_CLOSED_DISPLAY_PRICE = 70;

/** Small Bungalow — booking-closed listing price (same seasonal logic as Big, different amount). */
export const SMALL_BUNGALOW_CLOSED_DISPLAY_PRICE = 60;

/** Big or Small Bungalow — seasonal summer-only booking window in the price table. */
export function isSeasonalBungalowUnit(unitName: string, propertyName = ""): boolean {
  return isBigBungalowUnit(unitName, propertyName) || isSmallBungalowUnit(unitName, propertyName);
}

/**
 * Local calendar date: bookable nights for Big/Small Bungalow are 1 June – 30 September (inclusive).
 * Matches server price-table closed periods for these units.
 */
export function isLocalDateInBungalowOpenSeason(date: Date): boolean {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m < 6 || m > 9) return false;
  if (m >= 6 && m <= 8) return true;
  return d <= 30;
}

/** Small Bungalow – matches unit/property naming (excludes Big Bungalow). */
export function isSmallBungalowUnit(unitName: string, propertyName = ""): boolean {
  if (isBigBungalowUnit(unitName, propertyName)) return false;
  const n = (s: string) => (s || "").toLowerCase().trim().replace(/\s+/g, " ");
  const u = n(unitName);
  const p = n(propertyName);
  if (!/bungalow/.test(`${u} ${p}`)) return false;
  const smallish = (hay: string) =>
    /\bsmall\s*bungalow\b/.test(hay) || hay.includes("μικρό") || hay.includes("mikro");
  return smallish(u) || smallish(p);
}

/** Nightly rate when a bungalow unit is in a server-flagged closed period. */
export function getClosedBungalowNightlyDisplayPrice(
  unitName: string,
  propertyName: string,
  isClosed: boolean,
  regularNightly: number,
): number {
  if (!isClosed) return regularNightly;
  if (isBigBungalowUnit(unitName, propertyName)) return BIG_BUNGALOW_CLOSED_DISPLAY_PRICE;
  if (isSmallBungalowUnit(unitName, propertyName)) return SMALL_BUNGALOW_CLOSED_DISPLAY_PRICE;
  return regularNightly;
}

/** Translation key for fixed season copy when Big/Small Bungalow is closed (reopen date hidden). */
export function getClosedBungalowSeasonMessageKey(
  unitName: string,
  propertyName: string,
  isClosed: boolean,
): "property.bigBungalow.closedSeasonRange" | "property.smallBungalow.closedSeasonRange" | null {
  if (!isClosed) return null;
  if (isBigBungalowUnit(unitName, propertyName)) return "property.bigBungalow.closedSeasonRange";
  if (isSmallBungalowUnit(unitName, propertyName)) return "property.smallBungalow.closedSeasonRange";
  return null;
}
