import { supabase } from "../lib/db";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AppError,
} from "../lib/errors";
import { nanoid } from "nanoid";

/**
 * FIXED: Calculate booking price with consistent tax logic
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
    .select(`
      *,
      property:properties(*)
    `)
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

  // FIXED: Enhanced coupon validation
  if (couponCode) {
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (couponError || !coupon) {
      console.log("🔍 [COUPON] Coupon not found or inactive:", couponCode);
    } else {
      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = new Date(coupon.valid_until);
      
      if (validFrom <= now && validUntil >= now) {
        if (!coupon.min_booking_amount || totalPrice >= coupon.min_booking_amount) {
          if (!coupon.max_uses || coupon.used_count < coupon.max_uses) {
            if (coupon.discount_type === "PERCENTAGE") {
              discountAmount = totalPrice * (coupon.discount_value / 100);
            } else {
              discountAmount = coupon.discount_value;
            }
            discountAmount = Math.min(discountAmount, totalPrice);
            console.log("✅ [COUPON] Applied coupon:", coupon.code, "Discount:", discountAmount);
          } else {
            console.log("❌ [COUPON] Max uses reached for coupon:", coupon.code);
          }
        } else {
          console.log("❌ [COUPON] Minimum booking amount not met:", totalPrice, "<", coupon.min_booking_amount);
        }
      } else {
        console.log("❌ [COUPON] Coupon expired:", coupon.code, validFrom, "-", validUntil);
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
      taxRate = taxSettings.tax_rate;
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
    taxRate: Math.round(taxRate * 100), // Return as percentage
  };
}

/**
 * FIXED: Create booking with proper error handling and coupon usage tracking
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

  const { data: booking, error } = await supabase
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

  if (error || !booking) {
    console.error("❌ [BOOKING] Failed to create booking:", error);
    throw new AppError(500, "Failed to create booking");
  }

  // FIXED: Update coupon usage with proper error handling
  if (couponCode && pricing.discountAmount > 0) {
    try {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('id, used_count, max_uses')
        .eq('code', couponCode.toUpperCase())
        .single();
      
      if (coupon) {
        const newUsedCount = coupon.used_count + 1;
        
        // Check if we're exceeding max uses
        if (coupon.max_uses && newUsedCount > coupon.max_uses) {
          console.log("⚠️ [COUPON] Would exceed max uses, not updating:", couponCode);
        } else {
          const { error: updateError } = await supabase
            .from('coupons')
            .update({ used_count: newUsedCount })
            .eq('id', coupon.id);
            
          if (updateError) {
            console.error("❌ [COUPON] Failed to update usage:", updateError);
          } else {
            console.log("✅ [COUPON] Updated usage count:", couponCode, "to", newUsedCount);
          }
        }
      }
    } catch (error) {
      console.error("❌ [COUPON] Error updating coupon usage:", error);
      // Don't fail the booking if coupon update fails
    }
  }

  console.log("✅ [BOOKING] Created booking:", booking.booking_number);
  return booking;
}

/**
 * FIXED: Enhanced availability checking with proper date handling
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

  // FIXED: Proper date formatting for Supabase
  const checkInISO = checkInDate.toISOString().split('T')[0];
  const checkOutISO = checkOutDate.toISOString().split('T')[0];

  // Check for overlapping bookings
  const { data: conflictingBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('unit_id', unitId)
    .neq('status', 'CANCELLED')
    .or(`check_in_date.lt.${checkOutISO},check_out_date.gt.${checkInISO}`);

  if (conflictingBookings && conflictingBookings.length > 0) {
    return { isAvailable: false, reason: "Dates are already booked" };
  }

  // Check for date blockages
  const { data: blockages } = await supabase
    .from('date_blockages')
    .select('*')
    .eq('property_id', property.id)
    .or(`start_date.lte.${checkOutISO},end_date.gte.${checkInISO}`);

  if (blockages && blockages.length > 0) {
    return { isAvailable: false, reason: "Dates are blocked" };
  }

  return { isAvailable: true };
}

/**
 * FIXED: Enhanced booking retrieval with proper relations
 */
export async function getBookingById(bookingId: string) {
  const { data: booking, error } = await supabase
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
    `)
    .eq('id', bookingId)
    .single();

  if (error || !booking) {
    throw new NotFoundError("Booking not found");
  }

  return booking;
}

/**
 * FIXED: Enhanced user bookings with proper error handling
 */
export async function getUserBookings(userId: string) {
  const { data: bookings, error } = await supabase
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

  if (error) {
    console.error("❌ [BOOKING] Error fetching user bookings:", error);
    return [];
  }

  return bookings || [];
}

export default {
  calculateBookingPrice,
  createBooking,
  checkAvailability,
  getBookingById,
  getUserBookings,
};
