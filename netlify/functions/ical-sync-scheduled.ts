/**
 * Netlify Scheduled Function: Import iCal feeds from Airbnb/Booking into external_bookings.
 * Runs every 15 minutes. Schedule configured in netlify.toml.
 */
import { createClient } from "@supabase/supabase-js";
import { syncExternalCalendars } from "../../server/services/ical.service";

export default async (_req: Request) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[ical-sync] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return;
  }
  const supabase = createClient(url, key);
  const { ok, failed } = await syncExternalCalendars(supabase);
  console.log(`[ical-sync] Done: ${ok} ok, ${failed} failed`);
};

// Every 15 minutes (Netlify uses UTC)
export const config = { schedule: "*/15 * * * *" };
