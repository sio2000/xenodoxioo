import { supabase } from "../lib/db";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AppError,
} from "../lib/errors";

import { nanoid } from "nanoid";
import { randomBytes } from "crypto";

// Only these statuses block dates (payment succeeded); PENDING = unpaid, does not reserve
const BLOCKING_STATUSES = ["CONFIRMED", "COMPLETED", "CHECKED_IN", "CHECKED_OUT", "NO_SHOW"];
import {
  calculateTotalForDateRange,
  isRoomClosedForDateRange,
} from "./price-table.service";

// ── Helpers ────────────────────────────────────────────────────────

async function getActiveTaxRate(): Promise<number> {
  try {
    const { data } = await supabase
      .from("tax_settings")
      .select("tax_rate")
      .eq("is_active", true)
      .single();
    return data ? Number(data.tax_rate) / 100 : 0.15;
  } catch {
    return 0.15;
  }
}

async function getPaymentSettings() {
  try {
    const { data, error } = await supabase
      .from("payment_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return { depositPercentage: 0.25, fullPaymentThresholdDays: 21, balanceChargeDaysBefore: 21 };
    }

    return {
      depositPercentage: (Number(data.deposit_percentage) || 25) / 100,
      fullPaymentThresholdDays: Number(data.full_payment_threshold_days) || 21,
      balanceChargeDaysBefore: Number(data.balance_charge_days_before) || 21,
    };
  } catch {
    return { depositPercentage: 0.25, fullPaymentThresholdDays: 21, balanceChargeDaysBefore: 21 };
  }
}

function daysUntilDate(dateStr: string | Date): number {
  const target = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ── Check Availability ─────────────────────────────────────────────

function getTodayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function checkAvailability(
  unitId: string,
  checkInDate: Date,
  checkOutDate: Date,
): Promise<{ isAvailable: boolean; reason?: string }> {
  if (checkInDate >= checkOutDate) {
    return { isAvailable: false, reason: "Check-out date must be after check-in date" };
  }

  const today = getTodayStart();
  const checkInStart = new Date(checkInDate);
  checkInStart.setHours(0, 0, 0, 0);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysFromToday = Math.floor((checkInStart.getTime() - today.getTime()) / msPerDay);
  if (daysFromToday < 3) {
    return { isAvailable: false, reason: "Check-in must be at least 3 days from today" };
  }

  let resolvedId = unitId;
  try {
    resolvedId = await resolveUnitId(unitId);
  } catch {
    return { isAvailable: false, reason: "Unit not found" };
  }
  const { data: unit } = await supabase.from("units").select("*").eq("id", resolvedId).single();
  if (!unit) return { isAvailable: false, reason: "Unit not found" };

  const { data: conflicting } = await supabase
    .from("bookings")
    .select("id")
    .eq("unit_id", resolvedId)
    .in("status", BLOCKING_STATUSES)
    .lt("check_in_date", checkOutDate.toISOString())
    .gt("check_out_date", checkInDate.toISOString());

  if (conflicting && conflicting.length > 0) {
    return { isAvailable: false, reason: "Dates are already booked" };
  }

  const { data: blockages } = await supabase
    .from("date_blockages")
    .select("id")
    .eq("property_id", unit.property_id)
    .lte("start_date", checkOutDate.toISOString())
    .gte("end_date", checkInDate.toISOString());

  if (blockages && blockages.length > 0) {
    return { isAvailable: false, reason: "Dates are blocked" };
  }

  try {
    if (isRoomClosedForDateRange(unit.name, checkInDate, checkOutDate)) {
      return { isAvailable: false, reason: "Room is closed for this period" };
    }
  } catch (e: any) {
    if (e?.message?.includes("not found")) {
      return { isAvailable: false, reason: "Room not configured in price table" };
    }
    throw e;
  }

  return { isAvailable: true };
}

// ── Calculate Booking Price ────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveUnitId(unitIdOrSlug: string): Promise<string> {
  if (UUID_REGEX.test(unitIdOrSlug)) {
    const { data } = await supabase.from("units").select("id").eq("id", unitIdOrSlug).single();
    if (data) return data.id;
  }
  const { data } = await supabase.from("units").select("id").eq("slug", unitIdOrSlug).single();
  if (data) return data.id;
  throw new NotFoundError("Unit not found");
}

export async function calculateBookingPrice(
  unitId: string,
  checkInDate: Date,
  checkOutDate: Date,
  guests: number,
  couponCode?: string,
) {
  const resolvedId = await resolveUnitId(unitId);
  const { data: unit } = await supabase.from("units").select("*").eq("id", resolvedId).single();
  if (!unit) throw new NotFoundError("Unit not found");
  // All rooms allow up to 10 guests (Lykoskufi 5 & Ogra House have tiered pricing; others use base price)
  const effectiveMaxGuests = 10;
  if (guests > effectiveMaxGuests) throw new ValidationError(`Maximum ${effectiveMaxGuests} guests allowed`);

  const today = getTodayStart();
  const checkInStart = new Date(checkInDate);
  checkInStart.setHours(0, 0, 0, 0);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysFromToday = Math.floor((checkInStart.getTime() - today.getTime()) / msPerDay);
  if (daysFromToday < 3) {
    throw new ValidationError("Check-in must be at least 3 days from today");
  }

  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  const effectiveMinNights = Math.max(7, unit.min_stay_days || 1);
  if (nights < effectiveMinNights) throw new ValidationError(`Minimum ${effectiveMinNights} nights required`);

  const cleaningFee = Number(unit.cleaning_fee) || 0;

  let subtotalBeforeDiscount: number;
  let basePrice: number;
  try {
    const { totalPrice } = calculateTotalForDateRange(unit.name, checkInDate, checkOutDate, guests);
    subtotalBeforeDiscount = totalPrice;
    basePrice = Math.round((totalPrice / nights) * 100) / 100;
  } catch (e: any) {
    if (e?.message?.includes("closed")) {
      throw new ValidationError("Room is closed for this period");
    }
    if (e?.message?.includes("not found")) {
      basePrice = Number(unit.base_price) || 0;
      if (basePrice <= 0) throw new ValidationError("Room not configured in price table");
      subtotalBeforeDiscount = basePrice * nights;
    } else {
      throw e;
    }
  }
  let discountAmount = 0;

  if (couponCode) {
    const { data: coupon } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", couponCode.toUpperCase())
      .eq("is_active", true)
      .single();

    if (coupon) {
      const now = new Date();
      if (
        new Date(coupon.valid_from) <= now &&
        new Date(coupon.valid_until) >= now &&
        (!coupon.min_booking_amount || subtotalBeforeDiscount >= Number(coupon.min_booking_amount)) &&
        (!coupon.max_uses || coupon.used_count < coupon.max_uses)
      ) {
        discountAmount =
          coupon.discount_type === "PERCENTAGE"
            ? subtotalBeforeDiscount * (Number(coupon.discount_value) / 100)
            : Number(coupon.discount_value);
        discountAmount = Math.min(discountAmount, subtotalBeforeDiscount);
      }
    }
  }

  const subtotal = subtotalBeforeDiscount - discountAmount;
  const taxRate = await getActiveTaxRate();
  const taxableAmount = subtotal + cleaningFee;
  const taxes = Math.round(taxableAmount * taxRate * 100) / 100;
  const finalTotal = Math.round((subtotal + cleaningFee + taxes) * 100) / 100;

  const paymentSettings = await getPaymentSettings();
  const daysToCheckIn = daysUntilDate(checkInDate);
  const isFullPayment = daysToCheckIn <= paymentSettings.fullPaymentThresholdDays;

  const depositAmount = isFullPayment
    ? finalTotal
    : Math.round(finalTotal * paymentSettings.depositPercentage * 100) / 100;
  const balanceAmount = finalTotal - depositAmount;

  return {
    basePrice,
    nights,
    totalPrice: subtotalBeforeDiscount,
    cleaningFee,
    discountAmount,
    subtotal,
    taxes,
    taxRate: Math.round(taxRate * 100),
    finalTotal,
    depositAmount,
    balanceAmount,
    isFullPayment,
    scheduledChargeDate: isFullPayment
      ? null
      : (() => {
          const d = new Date(checkInDate);
          d.setDate(d.getDate() - paymentSettings.balanceChargeDaysBefore);
          return d.toISOString();
        })(),
  };
}

// ── Create Booking ─────────────────────────────────────────────────

export async function createBooking(
  unitId: string,
  userId: string | null,
  checkInDate: Date,
  checkOutDate: Date,
  guests: number,
  guestName: string,
  guestEmail: string,
  guestPhone?: string,
  _specialRequests?: string,
  couponCode?: string,
) {
  const resolvedId = await resolveUnitId(unitId);
  const availability = await checkAvailability(resolvedId, checkInDate, checkOutDate);
  if (!availability.isAvailable) throw new ConflictError(availability.reason || "Dates not available");

  const pricing = await calculateBookingPrice(resolvedId, checkInDate, checkOutDate, guests, couponCode);
  const bookingNumber = `BK${nanoid(8).toUpperCase()}`;
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

  const cancellationToken = randomBytes(32).toString("hex");

  const paymentType = pricing.isFullPayment ? "FULL" : "DEPOSIT";

  const { data: booking } = await supabase
    .from("bookings")
    .insert({
      booking_number: bookingNumber,
      unit_id: resolvedId,
      user_id: userId,
      check_in_date: checkInDate.toISOString(),
      check_out_date: checkOutDate.toISOString(),
      nights,
      base_price: pricing.basePrice,
      total_nights: nights,
      subtotal: pricing.subtotal,
      cleaning_fee: pricing.cleaningFee,
      taxes: pricing.taxes,
      discount_amount: pricing.discountAmount,
      deposit_amount: pricing.depositAmount,
      balance_amount: pricing.balanceAmount,
      remaining_amount: pricing.balanceAmount,
      total_price: pricing.finalTotal,
      guests,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      payment_status: "PENDING",
      payment_type: paymentType,
      deposit_paid: false,
      balance_paid: false,
      status: "PENDING",
      scheduled_charge_date: pricing.scheduledChargeDate,
      cancellation_token: cancellationToken,
    })
    .select()
    .single();

  if (!booking) throw new AppError(500, "Failed to create booking");

  if (couponCode && pricing.discountAmount > 0) {
    const { data: coupon } = await supabase
      .from("coupons")
      .select("used_count")
      .eq("code", couponCode.toUpperCase())
      .single();
    if (coupon) {
      await supabase
        .from("coupons")
        .update({ used_count: coupon.used_count + 1 })
        .eq("code", couponCode.toUpperCase());
    }
  }

  return booking;
}

// ── Get Booking by ID ──────────────────────────────────────────────

export async function getBookingById(
  bookingId: string,
  opts?: { userId?: string; guestEmail?: string },
) {
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, unit:units(*, property:properties(*))")
    .eq("id", bookingId)
    .single();

  if (!booking) throw new NotFoundError("Booking not found");

  if (opts) {
    if (opts.userId && booking.user_id !== opts.userId) {
      throw new AppError(403, "Unauthorized access to this booking");
    }
    if (opts.guestEmail && booking.guest_email.toLowerCase() !== opts.guestEmail.toLowerCase()) {
      throw new AppError(403, "Email does not match booking");
    }
  }

  return booking;
}

// ── Get User Bookings ──────────────────────────────────────────────

export async function getUserBookings(userId: string, page = 1, pageSize = 20) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count } = await supabase
    .from("bookings")
    .select("*, unit:units(*, property:properties(*))", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  return {
    bookings: data || [],
    total: count || 0,
    page,
    pageSize,
  };
}

// ── Update Booking Status ──────────────────────────────────────────

export async function updateBookingStatus(bookingId: string, status: string, reason?: string) {
  const updateData: Record<string, any> = { status };
  if (reason) updateData.cancellation_reason = reason;
  if (status === "CANCELLED") {
    updateData.cancelled_at = new Date().toISOString();
    updateData.is_cancelled = true;
  }

  const { data } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", bookingId)
    .select()
    .single();

  if (!data) throw new NotFoundError("Booking not found");
  return data;
}

// ── Cancel Booking ─────────────────────────────────────────────────

export async function cancelBooking(
  bookingId: string,
  opts?: { userId?: string; guestEmail?: string },
  reason?: string,
) {
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (!booking) throw new NotFoundError("Booking not found");

  if (opts) {
    if (opts.userId && booking.user_id !== opts.userId) {
      throw new AppError(403, "Unauthorized");
    }
    if (opts.guestEmail && booking.guest_email.toLowerCase() !== opts.guestEmail.toLowerCase()) {
      throw new AppError(403, "Email does not match booking");
    }
  }

  if (booking.status === "CANCELLED") {
    throw new ValidationError("Booking is already cancelled");
  }

  return await updateBookingStatus(bookingId, "CANCELLED", reason);
}

// ── Get Booking by Cancellation Token ──────────────────────────────

export async function getBookingByCancellationToken(token: string) {
  if (!token || token.length < 32) return null;

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, unit:units(*, property:properties(*))")
    .eq("cancellation_token", token)
    .single();

  if (!booking) return null;

  if (booking.status === "CANCELLED") {
    return { error: "ALREADY_CANCELLED" as const, booking };
  }

  if (booking.token_expires_at && new Date(booking.token_expires_at) < new Date()) {
    return { error: "EXPIRED" as const, booking };
  }

  return { booking };
}

// ── Cancel Booking by Token ────────────────────────────────────────

export async function cancelBookingByToken(token: string) {
  const result = await getBookingByCancellationToken(token);
  if (!result) throw new ValidationError("Μη έγκυρος σύνδεσμος");
  if ("error" in result) {
    if (result.error === "ALREADY_CANCELLED") throw new ValidationError("Η κράτηση έχει ήδη ακυρωθεί");
    if (result.error === "EXPIRED") throw new ValidationError("Ο σύνδεσμος έχει λήξει");
  }
  const booking = result.booking;
  if (!booking) throw new ValidationError("Μη έγκυρος σύνδεσμος");

  return await updateBookingStatus(booking.id, "CANCELLED");
}

// ── Admin: Get All Bookings ────────────────────────────────────────

export async function getAllBookings(filters?: {
  status?: string;
  propertyId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  let query = supabase
    .from("bookings")
    .select("*, unit:units(*, property:properties(*)), user:users(id, email, first_name, last_name)");

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.startDate) query = query.gte("check_in_date", filters.startDate.toISOString());
  if (filters?.endDate) query = query.lte("check_out_date", filters.endDate.toISOString());

  const { data } = await query.order("created_at", { ascending: false });
  return data || [];
}

// ── Booking Stats ──────────────────────────────────────────────────

export async function getBookingStats() {
  const { data: bookings } = await supabase.from("bookings").select("*");
  if (!bookings) return { total: 0, pending: 0, confirmed: 0, cancelled: 0, completed: 0, revenue: 0 };

  return {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "PENDING").length,
    confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
    cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
    completed: bookings.filter((b) => b.status === "COMPLETED").length,
    revenue: bookings.filter((b) => ["CONFIRMED", "COMPLETED"].includes(b.status)).reduce((s, b) => s + Number(b.total_price || 0), 0),
  };
}

// ── Occupied Date Ranges ───────────────────────────────────────────

export async function getOccupiedDateRanges(unitId: string) {
  const { data } = await supabase
    .from("bookings")
    .select("check_in_date, check_out_date")
    .eq("unit_id", unitId)
    .in("status", BLOCKING_STATUSES)
    .order("check_in_date", { ascending: true });
  return data || [];
}

// ── Get Available Units ────────────────────────────────────────────

export async function getAvailableUnits(
  checkInDate: Date | string,
  checkOutDate: Date | string,
  guests?: number,
  _propertyId?: string,
) {
  const checkIn = typeof checkInDate === "string" ? checkInDate : checkInDate.toISOString();
  const checkOut = typeof checkOutDate === "string" ? checkOutDate : checkOutDate.toISOString();

  let query = supabase.from("units").select("*, property:properties(*)").eq("is_active", true);
  if (guests) query = query.gte("max_guests", guests);

  const { data: units } = await query;
  if (!units) return [];

  const { data: conflicting } = await supabase
    .from("bookings")
    .select("unit_id")
    .in("status", BLOCKING_STATUSES)
    .lt("check_in_date", checkOut)
    .gt("check_out_date", checkIn);

  const bookedUnitIds = new Set((conflicting || []).map((b) => b.unit_id));
  return units.filter((u) => !bookedUnitIds.has(u.id));
}
