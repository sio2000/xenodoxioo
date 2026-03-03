import { supabase } from "../lib/db";
import { NotFoundError, AppError, ValidationError } from "../lib/errors";
import Stripe from "stripe";

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY not found');
  }
  return new Stripe(secretKey, {
    apiVersion: "2024-01-01" as any,
  });
};

/**
 * Create payment intent for booking
 */
export async function createPaymentIntent(
  bookingId: string,
  userId: string,
  paymentType: "DEPOSIT" | "BALANCE" | "FULL" = "DEPOSIT",
) {
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      user:users(*),
      unit:units(
        *,
        property:properties(*)
      )
    `)
    .eq('id', bookingId)
    .single();

  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  if (booking.user_id !== userId) {
    throw new AppError(403, "Unauthorized access to this booking");
  }

  // Calculate amount based on payment type (amount in cents)
  let amount = Math.round((booking.total_price || 0) * 100);
  if (paymentType === "DEPOSIT") {
    amount = Math.round((booking.total_price || 0) * 0.25 * 100); // 25% deposit
  } else if (paymentType === "BALANCE") {
    amount = Math.round((booking.total_price || 0) * 0.75 * 100); // 75% balance
  } else {
    amount = Math.round((booking.total_price || 0) * 100);
  }

  if (amount < 50) {
    throw new ValidationError("Payment amount is too small");
  }

  // Create Stripe payment intent
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "eur",
    metadata: {
      bookingId,
      userId,
      paymentType,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  // Create payment record
  const { data: payment } = await supabase
    .from('payments')
    .insert({
      booking_id: bookingId,
      user_id: userId,
      amount: amount / 100,
      currency: "EUR",
      payment_type: paymentType,
      stripe_payment_intent_id: paymentIntent.id,
      status: "PENDING",
    })
    .select()
    .single();

  return {
    clientSecret: paymentIntent.client_secret,
    paymentId: payment?.id,
  };
}

/**
 * Process successful payment
 */
export async function processSuccessfulPayment(
  paymentIntentId: string,
  chargeId?: string,
) {
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (!payment) {
    throw new NotFoundError("Payment record not found");
  }

  // Update payment record
  const updateData: any = {
    status: "COMPLETED",
    processed_at: new Date().toISOString(),
  };

  if (chargeId) {
    updateData.stripe_charge_id = chargeId;
  }

  // Get Stripe customer ID if available
  if (paymentIntent.customer) {
    updateData.stripe_customer_id = paymentIntent.customer as string;
  }

  await supabase
    .from('payments')
    .update(updateData)
    .eq('id', payment.id);

  // Update booking payment status
  await updateBookingPaymentStatus(payment.booking_id, payment.payment_type);

  return payment;
}

/**
 * Update booking payment status
 */
async function updateBookingPaymentStatus(
  bookingId: string,
  paymentType: string,
) {
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (!booking) return;

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('status', 'COMPLETED');

  const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  const updateData: any = {
    total_paid: totalPaid,
  };

  // Update specific payment flags
  if (paymentType === "DEPOSIT") {
    updateData.deposit_paid = true;
  } else if (paymentType === "BALANCE") {
    updateData.balance_paid = true;
  } else if (paymentType === "FULL") {
    updateData.deposit_paid = true;
    updateData.balance_paid = true;
  }

  // Update overall payment status
  if (totalPaid >= (booking.total_price || 0)) {
    updateData.payment_status = "PAID";
    updateData.status = "CONFIRMED";
  } else if (totalPaid > 0) {
    updateData.payment_status = "PARTIAL";
  }

  await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId);
}

/**
 * Get payment by ID
 */
export async function getPaymentById(paymentId: string) {
  const { data: payment } = await supabase
    .from('payments')
    .select(`
      *,
      booking:bookings(
        *,
        unit:units(
          *,
          property:properties(*)
        )
      )
    `)
    .eq('id', paymentId)
    .single();

  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  return payment;
}

/**
 * Get user payments
 */
export async function getUserPayments(userId: string) {
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      *,
      booking:bookings(
        *,
        unit:units(
          *,
          property:properties(*)
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return payments || [];
}

/**
 * Refund payment
 */
export async function refundPayment(paymentId: string, reason?: string) {
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  if (payment.status !== "COMPLETED") {
    throw new ValidationError("Payment cannot be refunded");
  }

  if (!payment.stripe_charge_id) {
    throw new ValidationError("No charge ID found for refund");
  }

  const stripe = getStripe();
  const refund = await stripe.refunds.create({
    charge: payment.stripe_charge_id,
    reason: "requested_by_customer",
    metadata: {
      paymentId,
      reason: reason || "Customer requested refund",
    },
  });

  // Update payment record
  await supabase
    .from('payments')
    .update({
      status: "REFUNDED",
      refund_amount: payment.amount,
      is_refundable: false,
    })
    .eq('id', paymentId);

  return {
    refundId: refund.id,
    amount: refund.amount,
    status: refund.status,
  };
}

/**
 * Handle Stripe webhook
 */
export async function handleStripeWebhook(
  eventType: string,
  event: any,
) {
  switch (eventType) {
    case "payment_intent.succeeded":
      await processSuccessfulPayment(event.data.object.id, event.data.object.charges?.data[0]?.id);
      break;

    case "payment_intent.payment_failed":
      await handlePaymentFailure(event.data.object.id);
      break;

    case "charge.dispute.created":
      await handleDispute(event.data.object);
      break;

    default:
      console.log(`Unhandled webhook event: ${eventType}`);
  }
}

/**
 * Handle payment failure
 */
async function handlePaymentFailure(paymentIntentId: string) {
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (!payment) return;

  await supabase
    .from('payments')
    .update({
      status: "FAILED",
      last_error: "Payment failed",
      failure_count: (payment.failure_count || 0) + 1,
    })
    .eq('id', payment.id);
}

/**
 * Get payment history for a booking
 */
export async function getPaymentHistory(bookingId: string) {
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });

  return payments || [];
}

/**
 * Handle payment dispute
 */
async function handleDispute(charge: any) {
  // Find payment by charge ID
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_charge_id', charge.id)
    .single();

  if (!payment) return;

  // Update payment with dispute information
  await supabase
    .from('payments')
    .update({
      status: "DISPUTED",
      last_error: `Payment disputed: ${charge.reason}`,
    })
    .eq('id', payment.id);

  // You might want to:
  // 1. Notify admin via email
  // 2. Update booking status
  // 3. Log the dispute for review
}
