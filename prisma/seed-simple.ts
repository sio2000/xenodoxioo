import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@booking.com' },
    update: {},
    create: {
      email: 'admin@booking.com',
      firstName: 'Admin',
      lastName: 'User',
      password: adminPassword,
      role: 'ADMIN',
      isEmailVerified: true,
    },
  });

  // Create test customer
  const customerPassword = await bcrypt.hash('customer123', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@booking.com' },
    update: {},
    create: {
      email: 'customer@booking.com',
      firstName: 'Test',
      lastName: 'Customer',
      password: customerPassword,
      role: 'CUSTOMER',
      isEmailVerified: true,
    },
  });

  // Create property
  const property = await prisma.property.upsert({
    where: { slug: 'luxury-villa' },
    update: {},
    create: {
      name: 'Luxury Villa',
      description: 'A beautiful luxury villa with stunning sea views',
      location: 'Santorini, Greece',
      city: 'Santorini',
      country: 'Greece',
      slug: 'luxury-villa',
      mainImage: 'https://images.unsplash.com/photo-1580587728372-5a4db3b8b9c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&auto=format&fit=crop&w=800&q=80',
      galleryImages: JSON.stringify([
        'https://images.unsplash.com/photo-1580587728372-5a4db3b8b9c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1566073771259-6a8506099925?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&auto=format&fit=crop&w=800&q=80'
      ]),
    },
  });

  // Create unit
  const unit = await prisma.unit.upsert({
    where: { propertyId: property.id, slug: 'villa-a' },
    update: {},
    create: {
      propertyId: property.id,
      name: 'Villa A',
      slug: 'villa-a',
      description: 'Spacious villa with private pool',
      maxGuests: 6,
      bedrooms: 3,
      bathrooms: 2,
      beds: 3,
      basePrice: 250,
      cleaningFee: 100,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1580587728372-5a4db3b8b9c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&auto=format&fit=crop&w=800&q=80'
      ]),
      minStayDays: 2,
    },
  });

  // Create sample bookings
  const checkInDate = new Date();
  checkInDate.setDate(checkInDate.getDate() + 35); // 35 days from now
  
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + 5); // 5 nights

  const booking1 = await prisma.booking.create({
    data: {
      bookingNumber: 'BK20240101001',
      unitId: unit.id,
      userId: customer.id,
      checkInDate,
      checkOutDate,
      nights: 5,
      basePrice: 250,
      totalNights: 5,
      subtotal: 1250,
      cleaningFee: 100,
      taxes: 125,
      discountAmount: 0,
      depositAmount: 368.75, // 25% of (1250 + 100 + 125)
      balanceAmount: 1106.25, // 75% of total
      totalPrice: 1475,
      guests: 4,
      guestName: 'John Doe',
      guestEmail: 'john.doe@example.com',
      guestPhone: '+1234567890',
      totalPaid: 368.75,
      paymentStatus: 'DEPOSIT_PAID',
      depositPaid: true,
      balancePaid: false,
      balanceChargeDate: new Date(checkInDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      status: 'DEPOSIT_PAID',
      stripeCustomerId: 'cus_test_customer1',
    },
  });

  // Create payment for the deposit
  await prisma.payment.create({
    data: {
      bookingId: booking1.id,
      userId: customer.id,
      amount: 368.75,
      currency: 'EUR',
      paymentType: 'DEPOSIT',
      stripePaymentIntentId: 'pi_test_deposit_001',
      stripeChargeId: 'ch_test_deposit_001',
      stripeCustomerId: 'cus_test_customer1',
      status: 'SUCCEEDED',
      processedAt: new Date(),
      description: 'Deposit payment for booking BK20240101001',
      isRefundable: false,
    },
  });

  // Create a confirmed booking (fully paid)
  const checkInDate2 = new Date();
  checkInDate2.setDate(checkInDate2.getDate() + 40);
  
  const checkOutDate2 = new Date(checkInDate2);
  checkOutDate2.setDate(checkOutDate2.getDate() + 3);

  const booking2 = await prisma.booking.create({
    data: {
      bookingNumber: 'BK20240101002',
      unitId: unit.id,
      userId: customer.id,
      checkInDate: checkInDate2,
      checkOutDate: checkOutDate2,
      nights: 3,
      basePrice: 250,
      totalNights: 3,
      subtotal: 750,
      cleaningFee: 100,
      taxes: 75,
      discountAmount: 0,
      depositAmount: 0,
      balanceAmount: 925,
      totalPrice: 925,
      guests: 2,
      guestName: 'Jane Smith',
      guestEmail: 'jane.smith@example.com',
      guestPhone: '+1234567891',
      totalPaid: 925,
      paymentStatus: 'SUCCEEDED',
      depositPaid: true,
      balancePaid: true,
      status: 'CONFIRMED',
      stripeCustomerId: 'cus_test_customer2',
    },
  });

  // Create payment for the full payment
  await prisma.payment.create({
    data: {
      bookingId: booking2.id,
      userId: customer.id,
      amount: 925,
      currency: 'EUR',
      paymentType: 'FULL',
      stripePaymentIntentId: 'pi_test_full_002',
      stripeChargeId: 'ch_test_full_002',
      stripeCustomerId: 'cus_test_customer2',
      status: 'SUCCEEDED',
      processedAt: new Date(),
      description: 'Full payment for booking BK20240101002',
      isRefundable: true,
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
