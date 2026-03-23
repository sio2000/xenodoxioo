/**
 * Seed ical_sync_config with Airbnb and Booking.com iCal URLs.
 * Run: pnpm exec tsx scripts/seed-ical-config.ts
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const AIRBNB_CONFIG = [
  { slug: "lykoskufi-1", url: "https://www.airbnb.gr/calendar/ical/1215038454512982017.ics?t=8cff5062e5294bb5b102e77dc5383e2c" },
  { slug: "lykoskufi-5", url: "https://www.airbnb.gr/calendar/ical/1212087610298077267.ics?t=42f5b8e9746b45fba663dc93c361c10c" },
  { slug: "ogra-house", url: "https://www.airbnb.gr/calendar/ical/7248697.ics?t=f575d97dc9b045d6a05293b3d20b1aa0" },
];

// Booking.com — Import from Extranet > Calendar > Export
const BOOKING_CONFIG: { slug: string; url: string }[] = [
  { slug: "lykoskufi-1", url: "https://ical.booking.com/v1/export/t/12033689-5f9a-4e81-96bd-2a079d64888f.ics" },
  { slug: "lykoskufi-2", url: "https://ical.booking.com/v1/export/t/9b198a70-c5fe-4ccc-8377-f84bbdcf8038.ics" },
  { slug: "lykoskufi-5", url: "https://ical.booking.com/v1/export/t/2e20d5ea-e273-4207-9fc6-a494aaf4a1eb.ics" },
  { slug: "ogra-house", url: "https://ical.booking.com/v1/export/t/0e54f0e6-03af-4c26-9341-c7f1190a8527.ics" },
];

async function main() {
  const { data: units } = await supabase.from("units").select("id, slug");
  if (!units?.length) {
    console.error("No units found. Run migrations first.");
    process.exit(1);
  }

  const bySlug = new Map(units.map((u) => [u.slug, u.id]));
  const rows: { unit_id: string; source: string; ical_url: string }[] = [];

  for (const { slug, url } of AIRBNB_CONFIG) {
    const unitId = bySlug.get(slug);
    if (unitId) rows.push({ unit_id: unitId, source: "AIRBNB", ical_url: url });
    else console.warn(`Unit not found for slug: ${slug}`);
  }
  for (const { slug, url } of BOOKING_CONFIG) {
    const unitId = bySlug.get(slug);
    if (unitId) rows.push({ unit_id: unitId, source: "BOOKING", ical_url: url });
    else console.warn(`Unit not found for slug: ${slug}`);
  }

  if (rows.length === 0) {
    console.log("Nothing to insert.");
    return;
  }

  const { error } = await supabase
    .from("ical_sync_config")
    .upsert(rows, { onConflict: "unit_id,source", ignoreDuplicates: false });

  if (error) {
    console.error("Upsert failed:", error);
    process.exit(1);
  }
  console.log(`Seeded ${rows.length} ical_sync_config rows.`);
}

main();
