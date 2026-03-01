import { differenceInDays, isBefore, addDays, startOfDay } from 'date-fns';
import StripeService from './stripe';
import Stripe from 'stripe';
import prisma from '../lib/db';

// Define enums locally to avoid import issues
enum BookingStatus {
  PENDING = 'PENDING',
  DEPOSIT_PAID = 'DEPOSIT_PAID',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}

enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
  PARTIAL = 'PARTIAL'
}

enum PaymentType {
  DEPOSIT = 'DEPOSIT',
  BALANCE = 'BALANCE',
  FULL = 'FULL',
  REFUND = 'REFUND'
}

export class BookingService {
  static async checkAvailability(unitId: string, checkInDate: Date, checkOutDate: Date) {
    // Check for overlapping bookings
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        unitId,
        status: {
          notIn: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW]
        },
        OR: [
          {
            checkInDate: {
              lt: checkOutDate
            },
            checkOutDate: {
              gt: checkInDate
            }
          }
        ]
      }
    });

    return overlappingBookings.length === 0;
  }

  static async calculatePricing(
    unitId: string,
    checkInDate: Date,
    checkOutDate: Date,
    guests: number
  ) {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        property: {
          include: {
            seasonalPricings: true
          }
        }
      }
    });

    if (!unit) {
      throw new Error('Unit not found');
    }

    if (guests > unit.maxGuests) {
      throw new Error(`Unit can only accommodate ${unit.maxGuests} guests`);
    }

    const nights = differenceInDays(checkOutDate, checkInDate);
    if (nights < unit.minStayDays) {
      throw new Error(`Minimum stay is ${unit.minStayDays} nights`);
    }

    let basePrice = unit.basePrice;
    let totalPrice = 0;
    const nightlyRates: { date: Date; rate: number }[] = [];

    // Calculate pricing for each night
    for (let i = 0; i < nights; i++) {
      const currentDate = addDays(checkInDate, i);
      const nightlyRate = await this.getNightlyRate(unitId, currentDate, basePrice);
      nightlyRates.push({ date: currentDate, rate: nightlyRate });
      totalPrice += nightlyRate;
    }

    const subtotal = totalPrice;
    const cleaningFee = unit.cleaningFee;
    const taxes = subtotal * 0.1; // 10% tax rate
    const totalBeforeDiscounts = subtotal + cleaningFee + taxes;

    return {
      basePrice,
      nights,
      nightlyRates,
      subtotal,
      cleaningFee,
      taxes,
      totalBeforeDiscounts,
      totalPrice: totalBeforeDiscounts
    };
  }

  private static async getNightlyRate(unitId: string, date: Date, baseRate: number): Promise<number> {
    const seasonalPricing = await prisma.seasonalPricing.findFirst({
      where: {
        propertyId: unitId, // This should be propertyId, need to fix the query
        startDate: { lte: date },
        endDate: { gte: date }
      }
    });

    return seasonalPricing?.pricePerNight || baseRate;
  }

  static async createBooking(data: {
    unitId: string;
    userId: string;
    checkInDate: Date;
    checkOutDate: Date;
    guests: number;
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    specialRequests?: string;
  }) {
    const { unitId, userId, checkInDate, checkOutDate, guests, guestName, guestEmail, guestPhone, specialRequests } = data;

    // Check availability first
    const isAvailable = await this.checkAvailability(unitId, checkInDate, checkOutDate);
    if (!isAvailable) {
      throw new Error('Unit is not available for the selected dates');
    }

    // Calculate pricing
    const pricing = await this.calculatePricing(unitId, checkInDate, checkOutDate, guests);

    // Determine payment logic based on booking timing
    const now = new Date();
    const daysUntilCheckIn = differenceInDays(checkInDate, now);
    const isLessThan30Days = daysUntilCheckIn < 30;

    let depositAmount = 0;
    let balanceAmount = 0;
    let paymentStatus: PaymentStatus;
    let bookingStatus: BookingStatus;

    if (isLessThan30Days) {
      // Charge 100% immediately
      depositAmount = 0;
      balanceAmount = pricing.totalPrice;
      paymentStatus = PaymentStatus.PENDING;
      bookingStatus = BookingStatus.PENDING;
    } else {
      // Charge 25% deposit now
      depositAmount = pricing.totalPrice * 0.25;
      balanceAmount = pricing.totalPrice * 0.75;
      paymentStatus = PaymentStatus.PENDING;
      bookingStatus = BookingStatus.PENDING;
    }

    // Generate booking number
    const bookingNumber = await this.generateBookingNumber();

    // Create Stripe customer if not exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    let stripeCustomerId = user.email; // We'll store the actual customer ID after creation
    // In a real implementation, you'd check if customer already exists

    // Calculate balance charge date (30 days before check-in)
    const balanceChargeDate = isLessThan30Days ? null : addDays(checkInDate, -30);

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        unitId,
        userId,
        checkInDate,
        checkOutDate,
        nights: differenceInDays(checkOutDate, checkInDate),
        basePrice: pricing.basePrice,
        totalNights: pricing.nights,
        subtotal: pricing.subtotal,
        cleaningFee: pricing.cleaningFee,
        taxes: pricing.taxes,
        totalPrice: pricing.totalPrice,
        depositAmount,
        balanceAmount,
        guests,
        guestName,
        guestEmail,
        guestPhone,
        specialRequests,
        paymentStatus,
        depositPaid: false,
        balancePaid: false,
        balanceChargeDate,
        status: bookingStatus,
        stripeCustomerId,
      }
    });

    return booking;
  }

  static async generateBookingNumber(): Promise<string> {
    const prefix = 'BK';
    const date = new Date();
    const dateStr = date.getFullYear().toString().slice(-2) + 
                    (date.getMonth() + 1).toString().padStart(2, '0') + 
                    date.getDate().toString().padStart(2, '0');
    
    // Find the last booking number for today
    const lastBooking = await prisma.booking.findFirst({
      where: {
        bookingNumber: {
          startsWith: `${prefix}${dateStr}`
        }
      },
      orderBy: {
        bookingNumber: 'desc'
      }
    });

    let sequence = 1;
    if (lastBooking) {
      const lastSequence = parseInt(lastBooking.bookingNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${prefix}${dateStr}${sequence.toString().padStart(4, '0')}`;
  }

  static async processDepositPayment(bookingId: string, paymentIntentId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.depositPaid) {
      throw new Error('Deposit already paid');
    }

    // Verify payment intent
    const paymentIntent = await StripeService.retrievePaymentIntent(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Payment not successful');
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        userId: booking.userId,
        amount: booking.depositAmount,
        paymentType: PaymentType.DEPOSIT,
        stripePaymentIntentId: paymentIntentId,
        stripeChargeId: paymentIntent.latest_charge as string || undefined,
        stripeCustomerId: paymentIntent.customer as string,
        status: PaymentStatus.SUCCEEDED,
        processedAt: new Date(),
        description: `Deposit payment for booking ${booking.bookingNumber}`,
        isRefundable: false, // Deposits are non-refundable
      }
    });

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        depositPaid: true,
        totalPaid: booking.totalPaid + booking.depositAmount,
        paymentStatus: booking.balanceAmount > 0 ? PaymentStatus.PARTIAL : PaymentStatus.SUCCEEDED,
        status: booking.balanceAmount > 0 ? BookingStatus.DEPOSIT_PAID : BookingStatus.CONFIRMED,
        depositPaymentIntentId: paymentIntentId,
      }
    });

    return { booking: updatedBooking, payment };
  }

  static async processBalancePayment(bookingId: string, paymentIntentId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.balancePaid) {
      throw new Error('Balance already paid');
    }

    // Verify payment intent
    const paymentIntent = await StripeService.retrievePaymentIntent(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Payment not successful');
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        userId: booking.userId,
        amount: booking.balanceAmount,
        paymentType: PaymentType.BALANCE,
        stripePaymentIntentId: paymentIntentId,
        stripeChargeId: paymentIntent.latest_charge as string || undefined,
        stripeCustomerId: paymentIntent.customer as string,
        status: PaymentStatus.SUCCEEDED,
        processedAt: new Date(),
        description: `Balance payment for booking ${booking.bookingNumber}`,
        isRefundable: true, // Balance payments are refundable (subject to policy)
      }
    });

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        balancePaid: true,
        totalPaid: booking.totalPaid + booking.balanceAmount,
        paymentStatus: PaymentStatus.SUCCEEDED,
        status: BookingStatus.CONFIRMED,
        balancePaymentIntentId: paymentIntentId,
      }
    });

    return { booking: updatedBooking, payment };
  }

  static async cancelBooking(bookingId: string, reason?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new Error('Booking already cancelled');
    }

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: reason,
        cancelledAt: new Date(),
      }
    });

    // Handle refunds based on policy
    await this.processRefunds(booking);

    return updatedBooking;
  }

  private static async processRefunds(booking: any) {
    // Deposits are always non-refundable
    // Balance payments may be refundable based on timing and policy
    
    const refundablePayments = booking.payments.filter((payment: any) => 
      payment.isRefundable && payment.status === PaymentStatus.SUCCEEDED
    );

    for (const payment of refundablePayments) {
      try {
        await StripeService.createRefund(
          payment.stripePaymentIntentId!,
          payment.amount
        );

        // Update payment status
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.REFUNDED,
            refundAmount: payment.amount,
          }
        });
      } catch (error) {
        console.error('Error processing refund:', error);
        // Log error but continue with other refunds
      }
    }
  }

  static async getBookingsRequiringBalanceCharge() {
    const now = new Date();
    
    return await prisma.booking.findMany({
      where: {
        depositPaid: true,
        balancePaid: false,
        balanceChargeDate: {
          lte: now
        },
        status: {
          in: [BookingStatus.DEPOSIT_PAID, BookingStatus.PENDING]
        }
      },
      include: {
        user: true,
        unit: true,
        payments: true
      }
    });
  }

  static async scheduleBalanceCharge(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking || !booking.balanceChargeDate) {
      throw new Error('Booking not found or no balance charge date set');
    }

    const paymentIntent = await StripeService.createPaymentIntent(
      booking.balanceAmount,
      'usd',
      booking.stripeCustomerId || undefined,
      {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        paymentType: 'balance'
      }
    );

    await prisma.payment.create({
      data: {
        bookingId,
        userId: booking.userId,
        amount: booking.balanceAmount,
        paymentType: PaymentType.BALANCE,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: booking.stripeCustomerId || undefined,
        status: PaymentStatus.PENDING,
        scheduledFor: booking.balanceChargeDate,
        description: `Scheduled balance payment for booking ${booking.bookingNumber}`,
        isRefundable: true,
      }
    });

    return paymentIntent;
  }
}

export default BookingService;
