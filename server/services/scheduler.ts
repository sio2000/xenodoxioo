import cron from 'node-cron';
import StripeService from './stripe';
import BookingService from './booking';
import prisma from '../lib/db';

// Define PaymentStatus enum locally to avoid import issues
enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED'
}

export class PaymentScheduler {
  private static isRunning = false;

  static start() {
    if (this.isRunning) {
      console.log('Payment scheduler already running');
      return;
    }

    this.isRunning = true;

    // Run every hour to check for scheduled payments
    cron.schedule('0 * * * *', async () => {
      console.log('Running scheduled payment check...');
      await this.processScheduledBalancePayments();
      await this.retryFailedPayments();
    });

    // Run daily at 2 AM for cleanup and reporting
    cron.schedule('0 2 * * *', async () => {
      console.log('Running daily maintenance...');
      await this.sendPaymentReminders();
      await this.generateDailyReport();
    });

    console.log('Payment scheduler started');
  }

  static async processScheduledBalancePayments() {
    try {
      const bookingsNeedingBalanceCharge = await BookingService.getBookingsRequiringBalanceCharge();
      
      console.log(`Found ${bookingsNeedingBalanceCharge.length} bookings needing balance charge`);

      for (const booking of bookingsNeedingBalanceCharge) {
        try {
          // Create payment intent for balance
          const paymentIntent = await StripeService.createPaymentIntent(
            booking.balanceAmount,
            'usd',
            booking.stripeCustomerId || undefined,
            {
              bookingId: booking.id,
              bookingNumber: booking.bookingNumber,
              paymentType: 'BALANCE',
              userId: booking.userId
            }
          );

          // Create payment record
          await prisma.payment.create({
            data: {
              bookingId: booking.id,
              userId: booking.userId,
              amount: booking.balanceAmount,
              paymentType: 'BALANCE',
              stripePaymentIntentId: paymentIntent.id,
              stripeCustomerId: booking.stripeCustomerId || undefined,
              status: PaymentStatus.PROCESSING,
              scheduledFor: booking.balanceChargeDate,
              description: `Scheduled balance payment for booking ${booking.bookingNumber}`,
              isRefundable: true,
            }
          });

          console.log(`Created payment intent for booking ${booking.bookingNumber}: ${paymentIntent.id}`);

        } catch (error) {
          console.error(`Error processing balance payment for booking ${booking.bookingNumber}:`, error);
          
          // Log the failure
          await prisma.payment.create({
            data: {
              bookingId: booking.id,
              userId: booking.userId,
              amount: booking.balanceAmount,
              paymentType: 'BALANCE',
              status: PaymentStatus.FAILED,
              scheduledFor: booking.balanceChargeDate,
              description: `Failed balance payment for booking ${booking.bookingNumber}`,
              failureReason: error instanceof Error ? error.message : 'Unknown error',
              failureCount: 1,
              isRefundable: true,
            }
          });
        }
      }

    } catch (error) {
      console.error('Error processing scheduled balance payments:', error);
    }
  }

  static async retryFailedPayments() {
    try {
      const maxRetries = parseInt(process.env.PAYMENT_RETRY_ATTEMPTS || '3');
      const retryDelayHours = parseInt(process.env.PAYMENT_RETRY_DELAY_HOURS || '24');

      const failedPayments = await prisma.payment.findMany({
        where: {
          status: PaymentStatus.FAILED,
          failureCount: { lt: maxRetries },
        },
        include: {
          booking: true,
          user: true
        }
      });

      for (const payment of failedPayments) {
        // Check if enough time has passed since last failure
        const hoursSinceLastFailure = Math.floor(
          (new Date().getTime() - payment.updatedAt.getTime()) / (1000 * 60 * 60)
        );

        if (hoursSinceLastFailure < retryDelayHours) {
          continue;
        }

        try {
          // Create new payment intent
          const paymentIntent = await StripeService.createPaymentIntent(
            payment.amount,
            'usd',
            payment.booking.stripeCustomerId || undefined,
            {
              bookingId: payment.bookingId,
              bookingNumber: payment.booking.bookingNumber,
              paymentType: payment.paymentType,
              userId: payment.userId,
              retryAttempt: (payment.failureCount + 1).toString()
            }
          );

          // Update existing payment record
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              stripePaymentIntentId: paymentIntent.id,
              status: PaymentStatus.PROCESSING,
              failureCount: payment.failureCount + 1,
              lastError: null,
            }
          });

          console.log(`Retried payment for booking ${payment.booking.bookingNumber}, attempt ${payment.failureCount + 1}`);

        } catch (error) {
          console.error(`Error retrying payment for booking ${payment.booking.bookingNumber}:`, error);
          
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              failureCount: payment.failureCount + 1,
              lastError: error instanceof Error ? error.message : 'Unknown error',
            }
          });
        }
      }

    } catch (error) {
      console.error('Error retrying failed payments:', error);
    }
  }

  static async sendPaymentReminders() {
    try {
      // Send reminders for payments due in 3 days
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const upcomingPayments = await prisma.payment.findMany({
        where: {
          status: PaymentStatus.PENDING,
          scheduledFor: {
            gte: new Date(),
            lte: threeDaysFromNow
          }
        },
        include: {
          booking: {
            include: {
              user: true
            }
          }
        }
      });

      for (const payment of upcomingPayments) {
        // TODO: Send email reminder
        console.log(`Payment reminder sent for booking ${payment.booking.bookingNumber}`);
      }

    } catch (error) {
      console.error('Error sending payment reminders:', error);
    }
  }

  static async generateDailyReport() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const stats = await prisma.payment.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        _sum: {
          amount: true
        },
        _count: true
      });

      const totalRevenue = await prisma.payment.aggregate({
        where: {
          status: PaymentStatus.SUCCEEDED,
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        _sum: {
          amount: true
        }
      });

      const failedPayments = await prisma.payment.count({
        where: {
          status: PaymentStatus.FAILED,
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      });

      const report = {
        date: today.toISOString().split('T')[0],
        totalRevenue: totalRevenue._sum.amount || 0,
        totalTransactions: stats.reduce((sum, stat) => sum + stat._count, 0),
        successfulTransactions: stats.find(s => s.status === PaymentStatus.SUCCEEDED)?._count || 0,
        failedTransactions: failedPayments,
        breakdown: stats.map(stat => ({
          status: stat.status,
          count: stat._count,
          amount: stat._sum.amount || 0
        }))
      };

      console.log('Daily payment report:', JSON.stringify(report, null, 2));

      // TODO: Send report to admin email
      return report;

    } catch (error) {
      console.error('Error generating daily report:', error);
    }
  }

  static async manuallyTriggerBalanceCharge(bookingId: string) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { user: true }
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (!booking.depositPaid || booking.balancePaid) {
        throw new Error('Booking not eligible for balance charge');
      }

      const paymentIntent = await StripeService.createPaymentIntent(
        booking.balanceAmount,
        'usd',
        booking.stripeCustomerId || undefined,
        {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          paymentType: 'BALANCE',
          userId: booking.userId,
          triggeredBy: 'admin'
        }
      );

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          bookingId: booking.id,
          userId: booking.userId,
          amount: booking.balanceAmount,
          paymentType: 'BALANCE',
          stripePaymentIntentId: paymentIntent.id,
          stripeCustomerId: booking.stripeCustomerId || undefined,
          status: PaymentStatus.PROCESSING,
          description: `Manual balance payment trigger for booking ${booking.bookingNumber}`,
          isRefundable: true,
        }
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        payment
      };

    } catch (error) {
      console.error('Error manually triggering balance charge:', error);
      throw error;
    }
  }
}

export default PaymentScheduler;
