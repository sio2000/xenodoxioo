import prisma from '../lib/db';
import { NotFoundError, ValidationError, AppError } from '../lib/errors';

/**
 * Get admin dashboard statistics
 */
export async function getAdminStats() {
  const [
    totalBookings,
    confirmedBookings,
    pendingBookings,
    totalRevenue,
    totalUsers,
    properties,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: 'CONFIRMED' } }),
    prisma.booking.count({ where: { status: 'PENDING' } }),
    prisma.payment.aggregate({
      where: { status: 'SUCCEEDED' },
      _sum: { amount: true },
    }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.property.findMany({
      include: {
        _count: {
          select: { units: true, bookings: true },
        },
      },
    }),
  ]);

  // Calculate occupancy
  const occupancyByProperty = await Promise.all(
    properties.map(async (prop) => {
      const totalDays = 365;
      const bookedDays = await prisma.booking.aggregate({
        where: {
          unit: { propertyId: prop.id },
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
        },
        _sum: { nights: true },
      });

      const occupancyPercentage = Math.round(
        ((bookedDays._sum.nights || 0) / (totalDays * prop._count.units)) * 100
      );

      return {
        id: prop.id,
        name: prop.name,
        units: prop._count.units,
        occupancyPercentage,
      };
    })
  );

  return {
    totalBookings,
    confirmedBookings,
    pendingBookings,
    totalRevenue: totalRevenue._sum.amount || 0,
    totalUsers,
    propertiesCount: properties.length,
    occupancyByProperty,
  };
}

/**
 * Get all bookings (admin view)
 */
export async function getAllBookings(
  page: number = 1,
  pageSize: number = 20,
  filters: {
    status?: string;
    propertyId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.propertyId) {
    where.unit = { propertyId: filters.propertyId };
  }
  if (filters.startDate || filters.endDate) {
    where.checkInDate = {};
    if (filters.startDate) where.checkInDate.gte = filters.startDate;
    if (filters.endDate) where.checkInDate.lte = filters.endDate;
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        unit: { include: { property: true } },
        user: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.booking.count({ where }),
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
 * Get all users (admin view)
 */
export async function getAllUsers(page: number = 1, pageSize: number = 20) {
  const skip = (page - 1) * pageSize;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
  ]);

  return {
    users,
    total,
    page,
    pageSize,
  };
}

/**
 * Create property (admin)
 */
export async function createProperty(data: {
  name: string;
  description: string;
  location: string;
  city: string;
  country: string;
  mainImage: string;
  galleryImages?: string[];
  amenities?: Array<{ name: string; description?: string; icon?: string }>;
}) {
  // Validate
  if (!data.name || !data.description || !data.city) {
    throw new ValidationError('Missing required property fields');
  }

  // Create property
  const slug = data.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');

  const property = await prisma.property.create({
    data: {
      name: data.name,
      description: data.description,
      location: data.location,
      city: data.city,
      country: data.country || 'Greece',
      mainImage: data.mainImage,
      galleryImages: data.galleryImages || [],
      slug,
      amenities: {
        createMany: {
          data: data.amenities || [],
        },
      },
    },
    include: { amenities: true },
  });

  return property;
}

/**
 * Update property (admin)
 */
export async function updateProperty(
  propertyId: string,
  data: {
    name?: string;
    description?: string;
    location?: string;
    city?: string;
    mainImage?: string;
    galleryImages?: string[];
  }
) {
  const property = await prisma.property.update({
    where: { id: propertyId },
    data,
  });

  return property;
}

/**
 * Create unit (admin)
 */
export async function createUnit(
  propertyId: string,
  data: {
    name: string;
    description?: string;
    maxGuests: number;
    bedrooms: number;
    bathrooms: number;
    beds: number;
    basePrice: number;
    cleaningFee?: number;
    images?: string[];
  }
) {
  // Validate
  if (!data.name || !data.maxGuests || !data.basePrice) {
    throw new ValidationError('Missing required unit fields');
  }

  // Check property exists
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!property) {
    throw new NotFoundError('Property not found');
  }

  const slug = data.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');

  const unit = await prisma.unit.create({
    data: {
      propertyId,
      name: data.name,
      slug,
      description: data.description,
      maxGuests: data.maxGuests,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      beds: data.beds,
      basePrice: data.basePrice,
      cleaningFee: data.cleaningFee || 0,
      images: data.images || [],
    },
  });

  return unit;
}

/**
 * Block dates (admin)
 */
export async function blockDates(
  propertyId: string,
  startDate: Date,
  endDate: Date,
  reason?: string
) {
  if (startDate >= endDate) {
    throw new ValidationError('End date must be after start date');
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!property) {
    throw new NotFoundError('Property not found');
  }

  const blockage = await prisma.dateBlockage.create({
    data: {
      propertyId,
      startDate,
      endDate,
      reason,
    },
  });

  return blockage;
}

/**
 * Unblock dates (admin)
 */
export async function unblockDates(blockageId: string) {
  const blockage = await prisma.dateBlockage.delete({
    where: { id: blockageId },
  });

  return blockage;
}

/**
 * Create seasonal pricing (admin)
 */
export async function createSeasonalPricing(
  propertyId: string,
  data: {
    name: string;
    startDate: Date;
    endDate: Date;
    pricePerNight: number;
    minStayDays?: number;
  }
) {
  if (!data.name || !data.pricePerNight) {
    throw new ValidationError('Missing required pricing fields');
  }

  if (data.startDate >= data.endDate) {
    throw new ValidationError('End date must be after start date');
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!property) {
    throw new NotFoundError('Property not found');
  }

  const pricing = await prisma.seasonalPricing.create({
    data: {
      propertyId,
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      pricePerNight: data.pricePerNight,
      minStayDays: data.minStayDays || 1,
    },
  });

  return pricing;
}

/**
 * Update seasonal pricing (admin)
 */
export async function updateSeasonalPricing(
  pricingId: string,
  data: {
    name?: string;
    pricePerNight?: number;
    minStayDays?: number;
  }
) {
  const pricing = await prisma.seasonalPricing.update({
    where: { id: pricingId },
    data,
  });

  return pricing;
}

/**
 * Delete seasonal pricing (admin)
 */
export async function deleteSeasonalPricing(pricingId: string) {
  await prisma.seasonalPricing.delete({
    where: { id: pricingId },
  });

  return { success: true };
}

/**
 * Create coupon (admin)
 */
export async function createCoupon(data: {
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  validFrom: Date;
  validUntil: Date;
  minBookingAmount?: number;
  maxUses?: number;
}) {
  const coupon = await prisma.coupon.create({
    data: {
      code: data.code.toUpperCase(),
      description: data.description,
      discountType: data.discountType,
      discountValue: data.discountValue,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      minBookingAmount: data.minBookingAmount,
      maxUses: data.maxUses,
    },
  });

  return coupon;
}

/**
 * Update coupon (admin)
 */
export async function updateCoupon(
  couponId: string,
  data: {
    code?: string;
    description?: string;
    discountValue?: number;
    validUntil?: Date;
    maxUses?: number;
    isActive?: boolean;
  }
) {
  const coupon = await prisma.coupon.update({
    where: { id: couponId },
    data: {
      ...(data.code && { code: data.code.toUpperCase() }),
      ...data,
    },
  });

  return coupon;
}

/**
 * Modify booking (admin only)
 */
export async function modifyBooking(
  bookingId: string,
  data: {
    notes?: string;
    specialRequests?: string;
  }
) {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data,
  });

  return booking;
}

/**
 * Create admin log entry
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId?: string,
  description?: string,
  changes?: any
) {
  const log = await prisma.adminLog.create({
    data: {
      adminId,
      action,
      entityType,
      entityId,
      description,
      changes: changes ? JSON.stringify(changes) : undefined,
    },
  });

  return log;
}

/**
 * Get admin logs
 */
export async function getAdminLogs(
  page: number = 1,
  pageSize: number = 50,
  filters: { adminId?: string; action?: string; entityType?: string } = {}
) {
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (filters.adminId) where.adminId = filters.adminId;
  if (filters.action) where.action = filters.action;
  if (filters.entityType) where.entityType = filters.entityType;

  const [logs, total] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      include: { admin: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.adminLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    pageSize,
  };
}
