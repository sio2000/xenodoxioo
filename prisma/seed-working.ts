import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // Skip if DB already has data (production safety)
  const existingProperties = await prisma.property.count();
  if (existingProperties > 0) {
    console.log('✅ Database already seeded, skipping.');
    return;
  }

  // Clean existing data
  await prisma.booking.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@booking.com',
      firstName: 'Admin',
      lastName: 'User',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create customer user
  const customerPassword = await bcrypt.hash('customer123', 10);
  const customer = await prisma.user.create({
    data: {
      email: 'customer@booking.com',
      firstName: 'John',
      lastName: 'Doe',
      password: customerPassword,
      role: 'CUSTOMER',
    },
  });

  console.log('✅ Created customer user:', customer.email);

  // Create property
  const property = await prisma.property.create({
    data: {
      name: 'Luxury Villa',
      slug: 'luxury-villa',
      description: 'Beautiful villa with amazing views',
      location: 'Santorini, Greece',
      city: 'Santorini',
      country: 'Greece',
      mainImage: 'https://images.unsplash.com/photo-1580587728372-5a4db3b8b9c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&auto=format&fit=crop&w=800&q=80',
      galleryImages: JSON.stringify([
        'https://images.unsplash.com/photo-1580587728372-5a4db3b8b9c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1566073771259-6a8506099925?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&auto=format&fit=crop&w=800&q=80'
      ]),
      isActive: true,
    },
  });

  console.log('✅ Created property:', property.name);

  // Create unit
  const unit = await prisma.unit.create({
    data: {
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
      isActive: true,
    },
  });

  console.log('✅ Created unit:', unit.name);

  // Create bookings
  const booking1 = await prisma.booking.create({
    data: {
      bookingNumber: 'BK-2024-001',
      unitId: unit.id,
      userId: customer.id,
      checkInDate: new Date('2024-12-15'),
      checkOutDate: new Date('2024-12-18'),
      nights: 3,
      basePrice: 250,
      totalNights: 3,
      subtotal: 750,
      cleaningFee: 100,
      taxes: 85,
      discountAmount: 0,
      depositAmount: 375,
      balanceAmount: 560,
      totalPrice: 935,
      guests: 4,
      guestName: 'John Doe',
      guestEmail: 'customer@booking.com',
      guestPhone: '+30 210 123 4567',
      totalPaid: 375,
      paymentStatus: 'DEPOSIT_PAID',
      depositPaid: true,
      balancePaid: false,
      status: 'CONFIRMED',
    },
  });

  console.log('✅ Created booking:', booking1.bookingNumber);

  const booking2 = await prisma.booking.create({
    data: {
      bookingNumber: 'BK-2024-002',
      unitId: unit.id,
      userId: customer.id,
      checkInDate: new Date('2024-12-20'),
      checkOutDate: new Date('2024-12-22'),
      nights: 2,
      basePrice: 250,
      totalNights: 2,
      subtotal: 500,
      cleaningFee: 100,
      taxes: 60,
      discountAmount: 0,
      depositAmount: 300,
      balanceAmount: 360,
      totalPrice: 960,
      guests: 2,
      guestName: 'Jane Smith',
      guestEmail: 'jane@example.com',
      guestPhone: '+30 210 987 6543',
      totalPaid: 0,
      paymentStatus: 'PENDING',
      depositPaid: false,
      balancePaid: false,
      status: 'PENDING',
    },
  });

  console.log('✅ Created booking:', booking2.bookingNumber);

  // Create payments
  await prisma.payment.create({
    data: {
      bookingId: booking1.id,
      userId: customer.id,
      stripePaymentIntentId: 'pi_test_123',
      amount: 375,
      currency: 'EUR',
      status: 'SUCCEEDED',
      paymentType: 'DEPOSIT',
    },
  });

  console.log('✅ Created payment for booking 1');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
