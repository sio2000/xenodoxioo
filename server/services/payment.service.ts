import prisma from '../lib/db';
import { NotFoundError, AppError, ValidationError } from '../lib/errors';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-01-01',
});

/**
 * Create payment intent for booking
 */
export async function createPaymentIntent(
  bookingId: string,
  userId: string,
  paymentType: 'DEPOSIT' | 'BALANCE' | 'FULL' = 'DEPOSIT'
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, unit: { include: { property: true } } },
  });

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  if (booking.userId !== userId) {
    throw new AppError(403, 'Unauthorized access to this booking');
  }

  // Calculate amount based on payment type
  let amount = booking.totalPrice;
  if (paymentType === 'DEPOSIT') {
    amount = Math.round(booking.totalPrice * 0.25 * 100); // 25% deposit
  } else if (paymentType === 'BALANCE') {
    amount = Math.round(booking.totalPrice * 0.75 * 100); // 75% balance
  } else {
    amount = Math.round(booking.totalPrice * 100);
  }

  if (amount < 50) {
    throw new ValidationError('Payment amount is too small');
  }

  // Create Stripe payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount, // in cents
    currency: 'usd',
    metadata: {
      bookingId,
      bookingNumber: booking.bookingNumber,
      userId,
      paymentType,
    },
    receipt_email: booking.guestEmail,
    description: `Booking ${booking.bookingNumber} - ${booking.unit.property.name}`,
  });

  // Store payment record
  const payment = await prisma.payment.create({
    data: {
      bookingId,
      userId,
      amount: amount / 100, // convert back to dollars
      currency: 'USD',
      paymentType: paymentType as any,
      stripePaymentIntentId: paymentIntent.id,
      status: 'PROCESSING',
      description: `${paymentType} payment for booking ${booking.bookingNumber}`,
      metadata: JSON.stringify({
        propertyId: booking.unit.propertyId,
        unitId: booking.unitId,
      }),
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: amount / 100,
    currency: 'USD',
  };
}

/**
 * Confirm payment after Stripe processes it
 */
export async function confirmPayment(paymentIntentId: string) {
  // Verify with Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    throw new AppError(400, `Payment status is ${paymentIntent.status}`);
  }

  // Update payment record
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  const stripeCharge = paymentIntent.charges.data[0];

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'SUCCEEDED',
      stripeChargeId: stripeCharge.id,
    },
  });

  // Update booking status
  const booking = await prisma.booking.findUnique({
    where: { id: payment.bookingId },
  });

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  let newStatus = 'DEPOSIT_PAID';
  if (payment.paymentType === 'BALANCE' || payment.paymentType === 'FULL') {
    newStatus = 'CONFIRMED';

    // Schedule balance payment if deposit was paid
    if (payment.paymentType === 'DEPOSIT') {
      const daysBeforeCheckIn = 30;
      const scheduledFor = new Date(booking.checkInDate);
      scheduledFor.setDate(scheduledFor.getDate() - daysBeforeCheckIn);

      // Create scheduled payment record for balance
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          userId: booking.userId,
          amount: Math.round(booking.totalPrice * 0.75 * 100) / 100,
          currency: 'USD',
          paymentType: 'BALANCE',
          status: 'PENDING',
          scheduledFor,
          description: `Balance payment for booking ${booking.bookingNumber}`,
        },
      });
    }
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: newStatus as any },
  });

  return {
    success: true,
    payment: updatedPayment,
    booking: await prisma.booking.findUnique({
      where: { id: booking.id },
    }),
  };
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await confirmPayment(paymentIntent.id);
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: paymentIntent.id },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            lastError: paymentIntent.last_payment_error?.message,
            failureCount: payment.failureCount + 1,
          },
        });
      }
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const payment = await prisma.payment.findUnique({
        where: { stripeChargeId: charge.id as string },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'REFUNDED',
            stripeRefundId: charge.refunds.data[0]?.id,
          },
        });
      }
      break;
    }
  }
}

/**
 * Refund a payment
 */
export async function refundPayment(bookingId: string, userId: string, reason?: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  if (booking.userId !== userId) {
    throw new AppError(403, 'Unauthorized access to this booking');
  }

  if (!['CONFIRMED', 'DEPOSIT_PAID'].includes(booking.status)) {
    throw new AppError(400, 'This booking cannot be refunded');
  }

  // Get successful payment
  const payment = await prisma.payment.findFirst({
    where: {
      bookingId,
      status: 'SUCCEEDED',
    },
  });

  if (!payment || !payment.stripeChargeId) {
    throw new AppError(400, 'No successful payment found to refund');
  }

  // Calculate refund based on cancellation policy
  const daysBeforeCheckIn = Math.ceil(
    (booking.checkInDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  let refundPercentage = 0;
  if (daysBeforeCheckIn > 60) {
    refundPercentage = 0.75;
  } else if (daysBeforeCheckIn > 30) {
    refundPercentage = 0.5;
  }

  const refundAmount = Math.round(booking.totalPrice * refundPercentage * 100);

  if (refundAmount > 0) {
    // Create Stripe refund
    const refund = await stripe.refunds.create({
      charge: payment.stripeChargeId,
      amount: refundAmount,
      metadata: {
        bookingId,
        reason: reason || 'Cancellation',
      },
    });

    // Update payment
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED',
        stripeRefundId: refund.id,
      },
    });
  }

  // Update booking
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CANCELLED',
      cancellationReason: reason,
      cancelledAt: new Date(),
    },
  });

  return {
    success: true,
    refundAmount: refundAmount / 100,
    refundPercentage: Math.round(refundPercentage * 100),
  };
}

/**
 * Get payment history for booking
 */
export async function getPaymentHistory(bookingId: string) {
  const payments = await prisma.payment.findMany({
    where: { bookingId },
    orderBy: { createdAt: 'desc' },
  });

  return payments;
}

/**
 * Process scheduled payments (called by a cron job)
 */
export async function processScheduledPayments() {
  const now = new Date();

  const scheduledPayments = await prisma.payment.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { lte: now },
    },
  });

  for (const payment of scheduledPayments) {
    try {
      // Create payment intent for scheduled payment
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(payment.amount * 100),
        currency: payment.currency.toLowerCase(),
        metadata: {
          paymentId: payment.id,
          bookingId: payment.bookingId,
          paymentType: payment.paymentType,
        },
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          stripePaymentIntentId: paymentIntent.id,
          status: 'PROCESSING',
        },
      });
    } catch (error: any) {
      console.error(`Error processing scheduled payment ${payment.id}:`, error);
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          failureCount: payment.failureCount + 1,
          lastError: error.message,
        },
      });
    }
  }
}
