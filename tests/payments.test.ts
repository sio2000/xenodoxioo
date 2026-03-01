import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import BookingService from '../server/services/booking';
import StripeService from '../server/services/stripe';

const prisma = new PrismaClient();

describe('Payment System Tests', () => {
  let testUser: any;
  let testProperty: any;
  let testUnit: any;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.payment.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'hashedpassword',
        role: 'CUSTOMER'
      }
    });

    // Create test property
    testProperty = await prisma.property.create({
      data: {
        name: 'Test Property',
        description: 'Test Description',
        location: 'Test Location',
        city: 'Test City',
        country: 'Greece',
        slug: 'test-property',
        mainImage: 'test.jpg'
      }
    });

    // Create test unit
    testUnit = await prisma.unit.create({
      data: {
        propertyId: testProperty.id,
        name: 'Test Unit',
        slug: 'test-unit',
        maxGuests: 4,
        bedrooms: 2,
        bathrooms: 1,
        beds: 2,
        basePrice: 100,
        cleaningFee: 50
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Booking >= 30 days before check-in', () => {
    it('should create booking with 25% deposit requirement', async () => {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 35); // 35 days from now
      
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + 3); // 3 nights

      const booking = await BookingService.createBooking({
        unitId: testUnit.id,
        userId: testUser.id,
        checkInDate,
        checkOutDate,
        guests: 2,
        guestName: 'John Doe',
        guestEmail: 'john@example.com',
        guestPhone: '+1234567890'
      });

      expect(booking.depositAmount).toBe(112.5); // 25% of (100*3 + 50)
      expect(booking.balanceAmount).toBe(337.5); // 75% of total
      expect(booking.totalPrice).toBe(450); // 100*3 + 50
      expect(booking.balanceChargeDate).toBeDefined();
      expect(booking.status).toBe('PENDING');
    });

    it('should process 25% deposit payment successfully', async () => {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 35);
      
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + 2);

      const booking = await BookingService.createBooking({
        unitId: testUnit.id,
        userId: testUser.id,
        checkInDate,
        checkOutDate,
        guests: 2,
        guestName: 'Jane Doe',
        guestEmail: 'jane@example.com'
      });

      // Mock successful Stripe payment intent
      const mockPaymentIntent = {
        id: 'pi_test_deposit',
        status: 'succeeded',
        amount: Math.round(booking.depositAmount * 100),
        currency: 'usd',
        customer: 'cus_test_customer',
        latest_charge: 'ch_test_charge'
      };

      // Mock StripeService.retrievePaymentIntent
      vi.spyOn(StripeService, 'retrievePaymentIntent').mockResolvedValue(mockPaymentIntent as any);

      const result = await BookingService.processDepositPayment(booking.id, mockPaymentIntent.id);

      expect(result.booking.depositPaid).toBe(true);
      expect(result.booking.totalPaid).toBe(booking.depositAmount);
      expect(result.booking.status).toBe('DEPOSIT_PAID');
      expect(result.payment.status).toBe('SUCCEEDED');
      expect(result.payment.amount).toBe(booking.depositAmount);
    });

    it('should schedule 75% balance payment for 30 days before check-in', async () => {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 35);
      
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + 2);

      const booking = await BookingService.createBooking({
        unitId: testUnit.id,
        userId: testUser.id,
        checkInDate,
        checkOutDate,
        guests: 2,
        guestName: 'Bob Smith',
        guestEmail: 'bob@example.com'
      });

      const expectedBalanceDate = new Date(checkInDate);
      expectedBalanceDate.setDate(expectedBalanceDate.getDate() - 30);

      expect(booking.balanceChargeDate).toBeDefined();
      expect(booking.balanceChargeDate!.toDateString()).toBe(expectedBalanceDate.toDateString());
    });
  });

  describe('Booking < 30 days before check-in', () => {
    it('should require 100% payment immediately', async () => {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 15); // 15 days from now
      
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + 2);

      const booking = await BookingService.createBooking({
        unitId: testUnit.id,
        userId: testUser.id,
        checkInDate,
        checkOutDate,
        guests: 2,
        guestName: 'Alice Johnson',
        guestEmail: 'alice@example.com'
      });

      expect(booking.depositAmount).toBe(0);
      expect(booking.balanceAmount).toBe(250); // 100*2 + 50
      expect(booking.totalPrice).toBe(250);
      expect(booking.balanceChargeDate).toBeNull();
    });

    it('should process full payment successfully', async () => {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 15);
      
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + 2);

      const booking = await BookingService.createBooking({
        unitId: testUnit.id,
        userId: testUser.id,
        checkInDate,
        checkOutDate,
        guests: 2,
        guestName: 'Charlie Brown',
        guestEmail: 'charlie@example.com'
      });

      // Mock successful Stripe payment intent
      const mockPaymentIntent = {
        id: 'pi_test_full',
        status: 'succeeded',
        amount: Math.round(booking.totalPrice * 100),
        currency: 'usd',
        customer: 'cus_test_customer',
        latest_charge: 'ch_test_charge_full'
      };

      jest.spyOn(StripeService, 'retrievePaymentIntent').mockResolvedValue(mockPaymentIntent as any);

      const result = await BookingService.processBalancePayment(booking.id, mockPaymentIntent.id);

      expect(result.booking.balancePaid).toBe(true);
      expect(result.booking.totalPaid).toBe(booking.totalPrice);
      expect(result.booking.status).toBe('CONFIRMED');
      expect(result.payment.status).toBe('SUCCEEDED');
      expect(result.payment.amount).toBe(booking.totalPrice);
    });
  });

  describe('Payment failure scenarios', () => {
    it('should handle 75% balance payment failure', async () => {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 35);
      
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + 2);

      const booking = await BookingService.createBooking({
        unitId: testUnit.id,
        userId: testUser.id,
        checkInDate,
        checkOutDate,
        guests: 2,
        guestName: 'David Wilson',
        guestEmail: 'david@example.com'
      });

      // First, process deposit
      const mockDepositIntent = {
        id: 'pi_test_deposit_fail',
        status: 'succeeded',
        amount: Math.round(booking.depositAmount * 100),
        currency: 'usd',
        customer: 'cus_test_customer',
        latest_charge: 'ch_test_deposit_fail'
      };

      jest.spyOn(StripeService, 'retrievePaymentIntent').mockResolvedValue(mockDepositIntent as any);
      await BookingService.processDepositPayment(booking.id, mockDepositIntent.id);

      // Now simulate balance payment failure
      const mockFailedIntent = {
        id: 'pi_test_balance_fail',
        status: 'requires_payment_method',
        amount: Math.round(booking.balanceAmount * 100),
        currency: 'usd',
        customer: 'cus_test_customer',
        last_payment_error: {
          message: 'Card declined'
        }
      };

      jest.spyOn(StripeService, 'retrievePaymentIntent').mockResolvedValue(mockFailedIntent as any);

      await expect(BookingService.processBalancePayment(booking.id, mockFailedIntent.id))
        .rejects.toThrow('Payment not successful');

      // Check that booking is still in DEPOSIT_PAID status
      const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(updatedBooking?.status).toBe('DEPOSIT_PAID');
    });
  });

  describe('Cancellation scenarios', () => {
    it('should handle cancellation with non-refundable deposit', async () => {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 35);
      
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + 2);

      const booking = await BookingService.createBooking({
        unitId: testUnit.id,
        userId: testUser.id,
        checkInDate,
        checkOutDate,
        guests: 2,
        guestName: 'Eva Davis',
        guestEmail: 'eva@example.com'
      });

      // Process deposit
      const mockDepositIntent = {
        id: 'pi_test_deposit_cancel',
        status: 'succeeded',
        amount: Math.round(booking.depositAmount * 100),
        currency: 'usd',
        customer: 'cus_test_customer',
        latest_charge: 'ch_test_deposit_cancel'
      };

      jest.spyOn(StripeService, 'retrievePaymentIntent').mockResolvedValue(mockDepositIntent as any);
      await BookingService.processDepositPayment(booking.id, mockDepositIntent.id);

      // Cancel booking
      const cancelledBooking = await BookingService.cancelBooking(booking.id, 'Guest cancellation');

      expect(cancelledBooking.status).toBe('CANCELLED');
      expect(cancelledBooking.cancellationReason).toBe('Guest cancellation');
      expect(cancelledBooking.cancelledAt).toBeDefined();
    });

    it('should handle cancellation of < 30 day booking (no refund)', async () => {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 15);
      
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + 2);

      const booking = await BookingService.createBooking({
        unitId: testUnit.id,
        userId: testUser.id,
        checkInDate,
        checkOutDate,
        guests: 2,
        guestName: 'Frank Miller',
        guestEmail: 'frank@example.com'
      });

      // Process full payment
      const mockFullIntent = {
        id: 'pi_test_full_cancel',
        status: 'succeeded',
        amount: Math.round(booking.totalPrice * 100),
        currency: 'usd',
        customer: 'cus_test_customer',
        latest_charge: 'ch_test_full_cancel'
      };

      jest.spyOn(StripeService, 'retrievePaymentIntent').mockResolvedValue(mockFullIntent as any);
      await BookingService.processBalancePayment(booking.id, mockFullIntent.id);

      // Cancel booking
      const cancelledBooking = await BookingService.cancelBooking(booking.id, 'Guest cancellation');

      expect(cancelledBooking.status).toBe('CANCELLED');
    });
  });

  describe('Double booking prevention', () => {
    it('should prevent double booking for same dates', async () => {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 35);
      
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + 3);

      // Create first booking
      await BookingService.createBooking({
        unitId: testUnit.id,
        userId: testUser.id,
        checkInDate,
        checkOutDate,
        guests: 2,
        guestName: 'Grace Lee',
        guestEmail: 'grace@example.com'
      });

      // Try to create overlapping booking
      await expect(BookingService.createBooking({
        unitId: testUnit.id,
        userId: testUser.id,
        checkInDate: new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000), // Next day
        checkOutDate: new Date(checkOutDate.getTime() + 24 * 60 * 60 * 1000), // Overlap
        guests: 2,
        guestName: 'Henry Ford',
        guestEmail: 'henry@example.com'
      })).rejects.toThrow('Unit is not available for the selected dates');
    });
  });

  describe('Availability checking', () => {
    it('should allow booking for available dates', async () => {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 40);
      
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + 2);

      const isAvailable = await BookingService.checkAvailability(testUnit.id, checkInDate, checkOutDate);
      expect(isAvailable).toBe(true);
    });

    it('should detect unavailable dates', async () => {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 35);
      
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + 3);

      // Create first booking
      await BookingService.createBooking({
        unitId: testUnit.id,
        userId: testUser.id,
        checkInDate,
        checkOutDate,
        guests: 2,
        guestName: 'Iris Johnson',
        guestEmail: 'iris@example.com'
      });

      // Check availability for same dates
      const isAvailable = await BookingService.checkAvailability(testUnit.id, checkInDate, checkOutDate);
      expect(isAvailable).toBe(false);
    });
  });

  describe('Pricing calculation', () => {
    it('should calculate pricing correctly for multiple nights', async () => {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 35);
      
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + 5); // 5 nights

      const pricing = await BookingService.calculatePricing(testUnit.id, checkInDate, checkOutDate, 2);

      expect(pricing.nights).toBe(5);
      expect(pricing.subtotal).toBe(500); // 100 * 5
      expect(pricing.cleaningFee).toBe(50);
      expect(pricing.totalPrice).toBe(550); // 500 + 50
    });

    it('should respect minimum stay requirements', async () => {
      // Update unit to have minimum stay
      await prisma.unit.update({
        where: { id: testUnit.id },
        data: { minStayDays: 3 }
      });

      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 35);
      
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + 2); // Only 2 nights

      await expect(BookingService.calculatePricing(testUnit.id, checkInDate, checkOutDate, 2))
        .rejects.toThrow('Minimum stay is 3 nights');
    });
  });
});
