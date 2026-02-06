import prisma from '../lib/db';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AppError,
} from '../lib/errors';
import { nanoid } from 'nanoid';

/**
 * Check if dates are available for a unit
 */
export async function checkAvailability(
  unitId: string,
  checkInDate: Date,
  checkOutDate: Date
): Promise<{ isAvailable: boolean; reason?: string }> {
  // Validate dates
  if (checkInDate >= checkOutDate) {
    return { isAvailable: false, reason: 'Check-out date must be after check-in date' };
  }

  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) {
    return { isAvailable: false, reason: 'Unit not found' };
  }

  // Get property for date blockages
  const property = await prisma.property.findUnique({
    where: { id: unit.propertyId },
  });

  if (!property) {
    return { isAvailable: false, reason: 'Property not found' };
  }

  // Check for overlapping bookings
  const conflictingBookings = await prisma.booking.findMany({
    where: {
      unitId,
      status: {
        in: ['CONFIRMED', 'DEPOSIT_PAID', 'CHECKED_IN'],
      },
      OR: [
        {
          checkInDate: { lt: checkOutDate },
          checkOutDate: { gt: checkInDate },
        },
      ],
    },
  });

  if (conflictingBookings.length > 0) {
    return {
      isAvailable: false,
      reason: 'Unit is not available for selected dates',
    };
  }

  // Check for date blockages
  const blockages = await prisma.dateBlockage.findMany({
    where: {
      propertyId: property.id,
      OR: [
        {
          startDate: { lt: checkOutDate },
          endDate: { gt: checkInDate },
        },
      ],
    },
  });

  if (blockages.length > 0) {
    return {
      isAvailable: false,
      reason: 'Unit is blocked for selected dates',
    };
  }

  return { isAvailable: true };
}

/**
 * Calculate pricing for a booking
 */
export async function calculatePrice(
  unitId: string,
  checkInDate: Date,
  checkOutDate: Date,
  couponCode?: string
) {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { property: true },
  });

  if (!unit) {
    throw new NotFoundError('Unit not found');
  }

  // Calculate nights
  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (nights < 1) {
    throw new ValidationError('Minimum stay is 1 night');
  }

  // Get applicable pricing (seasonal if exists)
  const seasonalPricing = await prisma.seasonalPricing.findFirst({
    where: {
      propertyId: unit.propertyId,
      startDate: { lte: checkInDate },
      endDate: { gte: checkOutDate },
      NOT: {
        startDate: checkOutDate,
      },
    },
  });

  const basePrice = seasonalPricing?.pricePerNight || unit.basePrice;
  const subtotal = basePrice * nights;
  const cleaningFee = unit.cleaningFee || 0;

  // Apply long stay discount
  let discountAmount = 0;
  const longStayDiscount = await prisma.longStayDiscount.findFirst({
    where: {
      minNights: { lte: nights },
      isActive: true,
    },
    orderBy: { minNights: 'desc' },
  });

  if (longStayDiscount) {
    discountAmount = (subtotal * longStayDiscount.discountPercentage) / 100;
  }

  // Apply coupon discount if provided
  let couponDiscount = 0;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
    });

    if (
      coupon &&
      coupon.isActive &&
      new Date() >= coupon.validFrom &&
      new Date() <= coupon.validUntil &&
      (!coupon.maxUses || coupon.usedCount < coupon.maxUses)
    ) {
      if (coupon.discountType === 'PERCENTAGE') {
        couponDiscount = ((subtotal - discountAmount) * coupon.discountValue) / 100;
      } else {
        couponDiscount = coupon.discountValue;
      }
    }
  }

  discountAmount += couponDiscount;

  // Calculate taxes (15%)
  const taxableAmount = subtotal - discountAmount + cleaningFee;
  const taxes = Math.round(taxableAmount * 0.15 * 100) / 100;

  const totalPrice = subtotal + cleaningFee + taxes - discountAmount;
  const depositAmount = Math.round(totalPrice * 0.25 * 100) / 100;
  const balanceAmount = totalPrice - depositAmount;

  return {
    basePrice,
    nights,
    subtotal,
    cleaningFee,
    discountAmount,
    taxes,
    totalPrice,
    depositAmount,
    balanceAmount,
  };
}

/**
 * Create a new booking
 */
export async function createBooking(
  unitId: string,
  userId: string,
  checkInDate: Date,
  checkOutDate: Date,
  guests: number,
  guestName: string,
  guestEmail: string,
  guestPhone?: string,
  specialRequests?: string,
  couponCode?: string
) {
  // Validate input
  if (!unitId || !userId || !guestName || !guestEmail || guests < 1) {
    throw new ValidationError('Missing required booking fields');
  }

  // Check availability
  const availabilityCheck = await checkAvailability(unitId, checkInDate, checkOutDate);
  if (!availabilityCheck.isAvailable) {
    throw new ConflictError(
      availabilityCheck.reason || 'Unit not available for selected dates'
    );
  }

  // Check guest capacity
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
  });

  if (!unit) {
    throw new NotFoundError('Unit not found');
  }

  if (guests > unit.maxGuests) {
    throw new ValidationError(`Maximum guests for this unit is ${unit.maxGuests}`);
  }

  // Calculate pricing
  const pricing = await calculatePrice(unitId, checkInDate, checkOutDate, couponCode);

  // Create booking
  const bookingNumber = `BK-${Date.now()}-${nanoid(6)}`.toUpperCase();

  const booking = await prisma.booking.create({
    data: {
      bookingNumber,
      unitId,
      userId,
      checkInDate,
      checkOutDate,
      nights: pricing.nights,
      basePrice: pricing.basePrice,
      totalNights: pricing.nights,
      subtotal: pricing.subtotal,
      cleaningFee: pricing.cleaningFee,
      taxes: pricing.taxes,
      discountAmount: pricing.discountAmount,
      totalPrice: pricing.totalPrice,
      guests,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
      status: 'PENDING',
    },
  });

  // Increment coupon usage if applicable
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
    });

    if (coupon) {
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: coupon.usedCount + 1 },
      });
    }
  }

  return booking;
}

/**
 * Get booking by ID
 */
export async function getBookingById(bookingId: string, userId?: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      unit: { include: { property: true } },
      payments: true,
    },
  });

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  // Check access if userId provided
  if (userId && booking.userId !== userId) {
    throw new AppError(403, 'You do not have access to this booking');
  }

  return booking;
}

/**
 * Get user bookings
 */
export async function getUserBookings(userId: string, page: number = 1, pageSize: number = 20) {
  const skip = (page - 1) * pageSize;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: { userId },
      include: {
        unit: { include: { property: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.booking.count({ where: { userId } }),
  ]);

  return {
    bookings,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Cancel booking
 */
export async function cancelBooking(
  bookingId: string,
  userId: string,
  reason?: string
) {
  const booking = await getBookingById(bookingId, userId);

  if (!['PENDING', 'DEPOSIT_PAID', 'CONFIRMED'].includes(booking.status)) {
    throw new ConflictError('This booking cannot be cancelled');
  }

  // Calculate refund based on cancellation policy
  const daysBeforeCheckIn = Math.ceil(
    (booking.checkInDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  let refundPercentage = 0;
  if (daysBeforeCheckIn > 60) {
    refundPercentage = 0.75; // 75% refund
  } else if (daysBeforeCheckIn > 30) {
    refundPercentage = 0.5; // 50% refund
  } else {
    refundPercentage = 0; // No refund
  }

  const refundAmount = Math.round(booking.totalPrice * refundPercentage * 100) / 100;

  // Update booking
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CANCELLED',
      cancellationReason: reason,
      cancelledAt: new Date(),
    },
    include: {
      unit: { include: { property: true } },
      payments: true,
    },
  });

  return {
    booking: updatedBooking,
    refundAmount,
    refundPercentage: Math.round(refundPercentage * 100),
  };
}

/**
 * Update booking status
 */
export async function updateBookingStatus(bookingId: string, status: string) {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: status as any },
  });

  return booking;
}

/**
 * Get available units for date range
 */
export async function getAvailableUnits(
  checkInDate: Date,
  checkOutDate: Date,
  guests: number,
  propertyId?: string
) {
  let units = await prisma.unit.findMany({
    where: {
      ...(propertyId && { propertyId }),
      isActive: true,
      maxGuests: { gte: guests },
    },
    include: { property: true },
  });

  // Filter by availability
  const availableUnits = [];
  for (const unit of units) {
    const { isAvailable } = await checkAvailability(unit.id, checkInDate, checkOutDate);
    if (isAvailable) {
      availableUnits.push(unit);
    }
  }

  return availableUnits;
}
