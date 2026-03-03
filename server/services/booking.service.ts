import { supabase } from "../lib/db";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AppError,
} from "../lib/errors";
import { nanoid } from "nanoid";

/**
 * Check if dates are available for a unit
 */
export async function checkAvailability(
  unitId: string,
  checkInDate: Date,
  checkOutDate: Date,
): Promise<{ isAvailable: boolean; reason?: string }> {
  // Validate dates
  if (checkInDate >= checkOutDate) {
    return {
      isAvailable: false,
      reason: "Check-out date must be after check-in date",
    };
  }

  const { data: unit } = await supabase
    .from('units')
    .select('*')
    .eq('id', unitId)
    .single();
    
  if (!unit) {
    return { isAvailable: false, reason: "Unit not found" };
  }

  // Get property for date blockages
  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', unit.property_id)
    .single();

  if (!property) {
    return { isAvailable: false, reason: "Property not found" };
  }

  // Check for overlapping bookings (any non-cancelled booking reserves the dates)
  const { data: conflictingBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('unit_id', unitId)
    .neq('status', 'CANCELLED')
    .or(`check_in_date.lt.${checkOutDate.toISOString()},check_out_date.gt.${checkInDate.toISOString()}`);

  if (conflictingBookings && conflictingBookings.length > 0) {
    return { isAvailable: false, reason: "Dates are already booked" };
  }

  // Check for date blockages
  const { data: blockages } = await supabase
    .from('date_blockages')
    .select('*')
    .eq('property_id', property.id)
    .or(`start_date.lte.${checkOutDate.toISOString()},end_date.gte.${checkInDate.toISOString()}`);

  if (blockages && blockages.length > 0) {
    return { isAvailable: false, reason: "Dates are blocked" };
  }

  return { isAvailable: true };
}

/**
 * Calculate booking price
 */
export async function calculateBookingPrice(
  unitId: string,
  checkInDate: Date,
  checkOutDate: Date,
  guests: number,
  couponCode?: string,
) {
  const { data: unit } = await supabase
    .from('units')
    .select('*')
    .eq('id', unitId)
    .single();

  if (!unit) {
    throw new NotFoundError("Unit not found");
  }

  if (guests > unit.max_guests) {
    throw new ValidationError(`Maximum ${unit.max_guests} guests allowed`);
  }

  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (nights < unit.min_stay_days) {
    throw new ValidationError(`Minimum ${unit.min_stay_days} nights required`);
  }

  let basePrice = unit.base_price;
  let totalPrice = basePrice * nights;
  let cleaningFee = unit.cleaning_fee || 0;

  // Check for seasonal pricing
  const { data: seasonalPricing } = await supabase
    .from('seasonal_pricing')
    .select('*')
    .eq('property_id', unit.property_id)
    .or(`start_date.lte.${checkOutDate.toISOString()},end_date.gte.${checkInDate.toISOString()}`);

  if (seasonalPricing && seasonalPricing.length > 0) {
    // Use seasonal pricing (simplified - in reality would need to calculate per night)
    basePrice = seasonalPricing[0].price_per_night;
    totalPrice = basePrice * nights;
  }

  let discountAmount = 0;

  // Apply coupon if provided
  if (couponCode) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (coupon) {
      const now = new Date();
      if (new Date(coupon.valid_from) <= now && new Date(coupon.valid_until) >= now) {
        if (!coupon.min_booking_amount || totalPrice >= coupon.min_booking_amount) {
          if (!coupon.max_uses || coupon.used_count < coupon.max_uses) {
            if (coupon.discount_type === "PERCENTAGE") {
              discountAmount = totalPrice * (coupon.discount_value / 100);
            } else {
              discountAmount = coupon.discount_value;
            }
            discountAmount = Math.min(discountAmount, totalPrice);
          }
        }
      }
    }
  }

  const subtotal = totalPrice - discountAmount;
  
  // FIXED: Get tax rate from database instead of hardcoded
  let taxRate = 0.15; // Default 15%
  try {
    const { data: taxSettings } = await supabase
      .from('tax_settings')
      .select('tax_rate')
      .eq('is_active', true)
      .single();
    
    if (taxSettings) {
      taxRate = parseFloat(taxSettings.tax_rate.toString());
    }
  } catch (error) {
    console.log("⚠️ [TAX] Using default tax rate due to error:", error.message);
  }
  
  const taxes = subtotal * taxRate;
  const finalTotal = subtotal + taxes + cleaningFee;

  return {
    basePrice,
    nights,
    totalPrice,
    cleaningFee,
    discountAmount,
    subtotal,
    taxes,
    finalTotal,
  };
}

/**
 * Create a booking
 */
export async function createBooking(
  unitId: string,
  userId: string | null,
  checkInDate: Date,
  checkOutDate: Date,
  guests: number,
  guestName: string,
  guestEmail: string,
  guestPhone?: string,
  couponCode?: string,
) {
  // Check availability first
  const availability = await checkAvailability(unitId, checkInDate, checkOutDate);
  if (!availability.isAvailable) {
    throw new ConflictError(availability.reason || "Dates not available");
  }

  // Calculate price
  const pricing = await calculateBookingPrice(unitId, checkInDate, checkOutDate, guests, couponCode);

  const bookingNumber = `BK${nanoid(8).toUpperCase()}`;
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

  const { data: booking } = await supabase
    .from('bookings')
    .insert({
      booking_number: bookingNumber,
      unit_id: unitId,
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
      deposit_amount: pricing.finalTotal * 0.25,
      balance_amount: pricing.finalTotal * 0.75,
      total_price: pricing.finalTotal,
      guests,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      payment_status: "PENDING",
      deposit_paid: false,
      balance_paid: false,
      status: "PENDING",
    })
    .select()
    .single();

  if (!booking) {
    throw new AppError(500, "Failed to create booking");
  }

  // Update coupon usage if applicable
  if (couponCode && pricing.discountAmount > 0) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('used_count')
      .eq('code', couponCode.toUpperCase())
      .single();
    
    if (coupon) {
      await supabase
        .from('coupons')
        .update({ used_count: coupon.used_count + 1 })
        .eq('code', couponCode.toUpperCase());
    }
  }

  return booking;
}

/**
 * Get booking by ID
 */
export async function getBookingById(bookingId: string) {
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      unit:units(
        *,
        property:properties(*)
      )
    `)
    .eq('id', bookingId)
    .single();

  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  return booking;
}

/**
 * Get user bookings
 */
export async function getUserBookings(userId: string) {
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      unit:units(
        *,
        property:properties(*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return bookings || [];
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  bookingId: string,
  status: string,
  reason?: string,
) {
  const updateData: any = { status };
  if (reason) updateData.cancellation_reason = reason;
  if (status === "CANCELLED") updateData.cancelled_at = new Date().toISOString();

  const { data: booking } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId)
    .select()
    .single();

  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  return booking;
}

/**
 * Get all bookings (admin)
 */
export async function getAllBookings(filters?: {
  status?: string;
  propertyId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  let query = supabase
    .from('bookings')
    .select(`
      *,
      unit:units(
        *,
        property:properties(*)
      ),
      user:users(
        id,
        email,
        first_name,
        last_name
      )
    `);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.propertyId) {
    query = query.eq('unit.property_id', filters.propertyId);
  }
  if (filters?.startDate) {
    query = query.gte('check_in_date', filters.startDate.toISOString());
  }
  if (filters?.endDate) {
    query = query.lte('check_out_date', filters.endDate.toISOString());
  }

  const { data: bookings } = await query.order('created_at', { ascending: false });

  return bookings || [];
}

/**
 * Get booking statistics
 */
export async function getBookingStats(propertyId?: string) {
  let query = supabase.from('bookings').select('*');

  if (propertyId) {
    query = query.eq('unit.property_id', propertyId);
  }

  const { data: bookings } = await query;

  if (!bookings) {
    return {
      total: 0,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
      revenue: 0,
    };
  }

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'PENDING').length,
    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
    cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
    completed: bookings.filter(b => b.status === 'COMPLETED').length,
    revenue: bookings
      .filter(b => b.status === 'COMPLETED')
      .reduce((sum, b) => sum + (b.total_price || 0), 0),
  };

  return stats;
}

/**
 * Get occupied date ranges for a unit
 */
export async function getOccupiedDateRanges(unitId: string) {
  const { data: bookings } = await supabase
    .from('bookings')
    .select('check_in_date, check_out_date')
    .eq('unit_id', unitId)
    .neq('status', 'CANCELLED')
    .order('check_in_date', { ascending: true });

  return bookings || [];
}

/**
 * Get available units for a date range
 */
export async function getAvailableUnits(
  checkInDate: string,
  checkOutDate: string,
  guests?: number,
) {
  let query = supabase
    .from('units')
    .select(`
      *,
      property:properties(*)
    `)
    .eq('is_active', true);

  if (guests) {
    query = query.gte('max_guests', guests);
  }

  const { data: units } = await query;

  if (!units) return [];

  // Filter out units with conflicting bookings
  const availableUnits = units.filter(unit => {
    // TODO: Check for conflicting bookings
    return true; // Simplified for now
  });

  return availableUnits;
}

/**
 * Cancel booking
 */
export async function cancelBooking(
  bookingId: string,
  reason?: string,
) {
  return await updateBookingStatus(bookingId, 'CANCELLED', reason);
}
