import prisma from '../lib/db';
import sgMail from '@sendgrid/mail';

const API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@leonidionhouses.com';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'LEONIDIONHOUSES';

if (API_KEY) {
  sgMail.setApiKey(API_KEY);
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  type: 'WELCOME' | 'BOOKING_CONFIRMATION' | 'PAYMENT_RECEIPT' | 'PAYMENT_REMINDER' | 'CANCELLATION_CONFIRMATION' | 'PASSWORD_RESET' | 'ARRIVAL_REMINDER' | 'REVIEW_REQUEST' | 'ADMIN_ALERT';
  userId?: string;
  bookingId?: string;
}

/**
 * Send email and log it
 */
async function sendEmail(options: EmailOptions) {
  try {
    const { to, subject, html, type, userId, bookingId } = options;

    // Log email in database
    const emailLog = await prisma.emailLog.create({
      data: {
        to,
        subject,
        type: type as any,
        userId,
        bookingId,
        status: 'PENDING',
      },
    });

    // Send email via SendGrid
    if (API_KEY) {
      await sgMail.send({
        to,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        html,
        trackingSettings: {
          openTracking: { enable: true },
          clickTracking: { enable: true },
        },
      });

      // Mark as sent
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } else {
      console.log('SendGrid not configured. Email would be sent to:', to);
      console.log('Subject:', subject);
    }

    return emailLog;
  } catch (error: any) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Welcome email
 */
export async function sendWelcomeEmail(email: string, firstName: string, userId?: string) {
  const html = `
    <h1>Welcome to LEONIDIONHOUSES!</h1>
    <p>Dear ${firstName},</p>
    <p>Thank you for joining us. We're excited to have you on board.</p>
    <p>You can now browse our beautiful villa collection and make your first booking.</p>
    <a href="${process.env.FRONTEND_URL}/properties" style="background-color: #0677A1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Browse Properties</a>
    <p>Best regards,<br/>The LEONIDIONHOUSES Team</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to LEONIDIONHOUSES',
    html,
    type: 'WELCOME',
    userId,
  });
}

/**
 * Booking confirmation email
 */
export async function sendBookingConfirmationEmail(
  email: string,
  booking: any,
  userId?: string
) {
  const html = `
    <h1>Booking Confirmation</h1>
    <p>Dear ${booking.guestName},</p>
    <p>Thank you for booking with LEONIDIONHOUSES!</p>
    <h2>Booking Details</h2>
    <ul>
      <li><strong>Booking Number:</strong> ${booking.bookingNumber}</li>
      <li><strong>Property:</strong> ${booking.unit.property.name}</li>
      <li><strong>Unit:</strong> ${booking.unit.name}</li>
      <li><strong>Check-in:</strong> ${new Date(booking.checkInDate).toLocaleDateString()}</li>
      <li><strong>Check-out:</strong> ${new Date(booking.checkOutDate).toLocaleDateString()}</li>
      <li><strong>Nights:</strong> ${booking.nights}</li>
      <li><strong>Guests:</strong> ${booking.guests}</li>
    </ul>
    <h2>Total Amount: $${booking.totalPrice.toFixed(2)}</h2>
    <p><strong>Deposit (25%):</strong> $${(booking.totalPrice * 0.25).toFixed(2)} (Due immediately)</p>
    <p><strong>Balance (75%):</strong> $${(booking.totalPrice * 0.75).toFixed(2)} (Due 30 days before arrival)</p>
    <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #0677A1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Booking</a>
    <p>Best regards,<br/>The LEONIDIONHOUSES Team</p>
  `;

  return sendEmail({
    to: email,
    subject: `Booking Confirmation - ${booking.bookingNumber}`,
    html,
    type: 'BOOKING_CONFIRMATION',
    userId,
    bookingId: booking.id,
  });
}

/**
 * Payment receipt email
 */
export async function sendPaymentReceiptEmail(
  email: string,
  booking: any,
  payment: any,
  userId?: string
) {
  const paymentTypeText =
    payment.paymentType === 'DEPOSIT'
      ? 'Deposit (25%)'
      : payment.paymentType === 'BALANCE'
      ? 'Balance (75%)'
      : 'Full Payment';

  const html = `
    <h1>Payment Receipt</h1>
    <p>Dear ${booking.guestName},</p>
    <p>Your payment has been successfully processed.</p>
    <h2>Payment Details</h2>
    <ul>
      <li><strong>Booking Number:</strong> ${booking.bookingNumber}</li>
      <li><strong>Payment Type:</strong> ${paymentTypeText}</li>
      <li><strong>Amount:</strong> $${payment.amount.toFixed(2)}</li>
      <li><strong>Date:</strong> ${new Date(payment.createdAt).toLocaleDateString()}</li>
      <li><strong>Transaction ID:</strong> ${payment.stripeChargeId || 'N/A'}</li>
    </ul>
    <p>Thank you for your payment!</p>
    <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #0677A1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Booking</a>
    <p>Best regards,<br/>The LEONIDIONHOUSES Team</p>
  `;

  return sendEmail({
    to: email,
    subject: `Payment Receipt - ${booking.bookingNumber}`,
    html,
    type: 'PAYMENT_RECEIPT',
    userId,
    bookingId: booking.id,
  });
}

/**
 * Password reset email
 */
export async function sendPasswordResetEmail(email: string, resetToken: string, userId?: string) {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
    <h1>Password Reset Request</h1>
    <p>You requested to reset your password. Click the link below to proceed:</p>
    <a href="${resetLink}" style="background-color: #0677A1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request a password reset, please ignore this email.</p>
    <p>Best regards,<br/>The LEONIDIONHOUSES Team</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset - LEONIDIONHOUSES',
    html,
    type: 'PASSWORD_RESET',
    userId,
  });
}

/**
 * Arrival reminder email
 */
export async function sendArrivalReminderEmail(email: string, booking: any, userId?: string) {
  const checkInDate = new Date(booking.checkInDate).toLocaleDateString();

  const html = `
    <h1>Arrival Reminder</h1>
    <p>Dear ${booking.guestName},</p>
    <p>This is a friendly reminder that your check-in is tomorrow at the ${booking.unit.property.name}!</p>
    <h2>Check-in Details</h2>
    <ul>
      <li><strong>Property:</strong> ${booking.unit.property.name}</li>
      <li><strong>Address:</strong> ${booking.unit.property.location}, ${booking.unit.property.city}</li>
      <li><strong>Check-in Date:</strong> ${checkInDate}</li>
      <li><strong>Check-in Time:</strong> 3:00 PM (or by arrangement)</li>
    </ul>
    <p>Please ensure you have the necessary documents and contact information saved.</p>
    <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #0677A1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Booking Details</a>
    <p>If you have any questions, please don't hesitate to contact us.</p>
    <p>Best regards,<br/>The LEONIDIONHOUSES Team</p>
  `;

  return sendEmail({
    to: email,
    subject: `Arrival Reminder - ${booking.bookingNumber}`,
    html,
    type: 'ARRIVAL_REMINDER',
    userId,
    bookingId: booking.id,
  });
}

/**
 * Cancellation confirmation email
 */
export async function sendCancellationConfirmationEmail(
  email: string,
  booking: any,
  refundAmount: number,
  userId?: string
) {
  const html = `
    <h1>Booking Cancelled</h1>
    <p>Dear ${booking.guestName},</p>
    <p>Your booking has been successfully cancelled.</p>
    <h2>Cancellation Details</h2>
    <ul>
      <li><strong>Booking Number:</strong> ${booking.bookingNumber}</li>
      <li><strong>Property:</strong> ${booking.unit.property.name}</li>
      <li><strong>Original Check-in:</strong> ${new Date(booking.checkInDate).toLocaleDateString()}</li>
      <li><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)}</li>
    </ul>
    <p>The refund will be processed back to your original payment method within 5-7 business days.</p>
    <p>We hope to see you again in the future!</p>
    <p>Best regards,<br/>The LEONIDIONHOUSES Team</p>
  `;

  return sendEmail({
    to: email,
    subject: `Booking Cancelled - ${booking.bookingNumber}`,
    html,
    type: 'CANCELLATION_CONFIRMATION',
    userId,
    bookingId: booking.id,
  });
}

/**
 * Review request email
 */
export async function sendReviewRequestEmail(email: string, booking: any, userId?: string) {
  const reviewLink = `${process.env.FRONTEND_URL}/dashboard/bookings/${booking.id}/review`;

  const html = `
    <h1>Share Your Experience</h1>
    <p>Dear ${booking.guestName},</p>
    <p>Thank you for staying at ${booking.unit.property.name}! We'd love to hear about your experience.</p>
    <p>Your review helps other guests make informed decisions and helps us improve our properties.</p>
    <a href="${reviewLink}" style="background-color: #0677A1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Write a Review</a>
    <p>Best regards,<br/>The LEONIDIONHOUSES Team</p>
  `;

  return sendEmail({
    to: email,
    subject: `Review Request - ${booking.unit.property.name}`,
    html,
    type: 'REVIEW_REQUEST',
    userId,
    bookingId: booking.id,
  });
}

/**
 * Admin alert email
 */
export async function sendAdminAlertEmail(
  subject: string,
  message: string,
  adminEmail?: string
) {
  const email = adminEmail || process.env.ADMIN_EMAIL || FROM_EMAIL;

  const html = `
    <h1>${subject}</h1>
    <p>${message}</p>
    <p>Timestamp: ${new Date().toLocaleString()}</p>
  `;

  return sendEmail({
    to: email,
    subject: `ALERT: ${subject}`,
    html,
    type: 'ADMIN_ALERT',
  });
}
