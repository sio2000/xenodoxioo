import { supabase } from "../lib/db";
import { NotFoundError, ConflictError, ValidationError, ServerError } from "../lib/errors";
import { randomBytes } from "crypto";
import { nanoid } from "nanoid";

const BLOCKING_STATUSES = ["CONFIRMED", "COMPLETED", "CHECKED_IN", "CHECKED_OUT", "NO_SHOW"];

function getTodayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateAsUtcNoon(dateStr: string | Date): Date {
  if (typeof dateStr === "object" && dateStr instanceof Date) {
    const d = dateStr;
    // Use UTC methods: date-only strings parse as UTC midnight, so extract UTC date parts
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
  }
  const s = String(dateStr).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 12, 0, 0));
  }
  return new Date(dateStr);
}

export async function createCustomOffer(
  inquiryId: string,
  unitId: string,
  checkInDate: string | Date,
  checkOutDate: string | Date,
  guests: number,
  customTotalEur: number,
) {
  const checkIn = parseDateAsUtcNoon(checkInDate);
  const checkOut = parseDateAsUtcNoon(checkOutDate);
  if (checkIn >= checkOut) {
    throw new ValidationError("Check-out must be after check-in");
  }
  if (customTotalEur < 1) {
    throw new ValidationError("Total must be at least €1");
  }
  if (guests < 1 || guests > 20) {
    throw new ValidationError("Guests must be 1–20");
  }

  const { data: inquiry } = await supabase.from("inquiries").select("property_id").eq("id", inquiryId).single();
  if (!inquiry) throw new NotFoundError("Inquiry not found");

  const { data: unit } = await supabase.from("units").select("id, property_id").eq("id", unitId).eq("is_active", true).single();
  if (!unit) throw new NotFoundError("Unit not found");
  if (unit.property_id !== inquiry.property_id) {
    throw new ValidationError("Unit must belong to inquiry property");
  }

  const today = getTodayStart();
  const checkInStart = new Date(checkIn);
  checkInStart.setHours(0, 0, 0, 0);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysFromToday = Math.floor((checkInStart.getTime() - today.getTime()) / msPerDay);
  if (daysFromToday < 0) {
    throw new ValidationError("Check-in cannot be in the past");
  }

  const { data: conflicting } = await supabase
    .from("bookings")
    .select("id")
    .eq("unit_id", unitId)
    .in("status", BLOCKING_STATUSES)
    .lt("check_in_date", checkOut.toISOString())
    .gt("check_out_date", checkIn.toISOString());

  if (conflicting && conflicting.length > 0) {
    throw new ConflictError("Dates are already booked");
  }

  const token = randomBytes(16).toString("hex");

  const { data: offer, error } = await supabase
    .from("custom_checkout_offers")
    .insert({
      token,
      inquiry_id: inquiryId,
      unit_id: unitId,
      property_id: inquiry.property_id,
      check_in_date: checkIn.toISOString(),
      check_out_date: checkOut.toISOString(),
      guests,
      custom_total_eur: customTotalEur,
    })
    .select()
    .single();

  if (error) {
    console.error("[CUSTOM_OFFER] Supabase insert error:", error);
    const msg = error.message || String(error);
    if (msg.includes("does not exist") || msg.includes("relation")) {
      throw new ServerError(
        "Custom checkout table missing. Run scripts/add-custom-checkout-offers.sql in Supabase SQL Editor."
      );
    }
    throw new ServerError(msg || "Failed to create offer");
  }
  if (!offer) throw new ServerError("Failed to create offer");

  return offer;
}

export async function getOfferByToken(token: string) {
  const { data: offer, error } = await supabase
    .from("custom_checkout_offers")
    .select("*, unit:units(name, max_guests), property:properties(name)")
    .eq("token", token)
    .is("used_at", null)
    .single();

  if (error || !offer) throw new NotFoundError("Offer not found or already used");
  return offer;
}
