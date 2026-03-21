import { supabase } from "../lib/db";
import { NotFoundError, AppError, ValidationError } from "../lib/errors";
import Stripe from "stripe";
import {
  sendBookingConfirmationEmail,
  sendPaymentReceiptEmail,
} from "./email.service";

const GUEST_USER_ID = "00000000-0000-0000-0000-000000000001";

const getStripe = (): Stripe => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey);
};

// ── helpers ────────────────────────────────────────────────────────

async function getPaymentSettings() {
  try {
    const { data, error } = await supabase
      .from("payment_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return { depositPercentage: 25, balanceChargeDaysBefore: 21, fullPaymentThresholdDays: 21, refundDepositOnCancel: false, currency: "EUR" };
    }

    return {
      depositPercentage: Number(data.deposit_percentage) || 25,
      balanceChargeDaysBefore: Number(data.balance_charge_days_before) || 21,
      fullPaymentThresholdDays: Number(data.full_payment_threshold_days) || 21,
      refundDepositOnCancel: Boolean(data.refund_deposit_on_cancel),
      currency: data.currency || "EUR",
    };
  } catch {
    return { depositPercentage: 25, balanceChargeDaysBefore: 21, fullPaymentThresholdDays: 21, refundDepositOnCancel: false, currency: "EUR" };
  }
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function daysUntilDate(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Create or get Stripe customer ──────────────────────────────────

async function ensureStripeCustomer(
  email: string,
  name: string,
  phone?: string,
): Promise<string> {
  const stripe = getStripe();
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) return existing.data[0].id;

  const customer = await stripe.customers.create({
    email,
    name,
    phone: phone || undefined,
    metadata: { source: "booking_platform" },
  });
  return customer.id;
}

// ── Create Payment Intent for a booking ────────────────────────────

export async function createPaymentIntent(
  bookingId: string,
  userId: string,
  paymentType?: "DEPOSIT" | "BALANCE" | "FULL",
) {
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, unit:units(*, property:properties(*))")
    .eq("id", bookingId)
    .single();

  if (!booking) throw new NotFoundError("Booking not found");
  if (booking.user_id && booking.user_id !== userId) {
    throw new AppError(403, "Unauthorized access to this booking");
  }

  const settings = await getPaymentSettings();
  const daysToCheckIn = daysUntilDate(booking.check_in_date);

  const effectiveType =
    paymentType ??
    (daysToCheckIn <= settings.fullPaymentThresholdDays ? "FULL" : "DEPOSIT");

  let amountEur: number;
  if (effectiveType === "FULL") {
    amountEur = Number(booking.total_price) || 0;
  } else if (effectiveType === "DEPOSIT") {
    amountEur = Number(booking.deposit_amount) || Number(booking.total_price) * (settings.depositPercentage / 100);
  } else {
    amountEur = Number(booking.remaining_amount) || Number(booking.balance_amount) || 0;
  }

  const cents = toCents(amountEur);
  if (cents < 50) throw new ValidationError("Payment amount too small (min €0.50)");

  const stripe = getStripe();
  const customerId = await ensureStripeCustomer(
    booking.guest_email,
    booking.guest_name,
    booking.guest_phone,
  );

  const intentParams: Stripe.PaymentIntentCreateParams = {
    amount: cents,
    currency: settings.currency.toLowerCase(),
    customer: customerId,
    metadata: {
      bookingId,
      userId,
      paymentType: effectiveType,
      bookingNumber: booking.booking_number,
    },
    payment_method_types: ["card"],
  };

  if (effectiveType === "DEPOSIT") {
    intentParams.setup_future_usage = "off_session";
  }

  const paymentIntent = await stripe.paymentIntents.create(intentParams);

  const { error: insertError } = await supabase.from("payments").insert({
    booking_id: bookingId,
    user_id: userId,
    amount: amountEur,
    currency: settings.currency,
    payment_type: effectiveType,
    stripe_payment_intent_id: paymentIntent.id,
    stripe_customer_id: customerId,
    status: "PENDING",
    description: `${effectiveType} payment for booking ${booking.booking_number}`,
  });

  if (insertError) {
    console.error(`[PAYMENT] Failed to insert payment record:`, insertError.message);
    throw new Error(`Failed to create payment record: ${insertError.message}`);
  }

  console.log(`[PAYMENT] Payment record created for booking ${booking.booking_number}, PI=${paymentIntent.id}, type=${effectiveType}`);

  await supabase
    .from("bookings")
    .update({ stripe_customer_id: customerId })
    .eq("id", bookingId);

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: amountEur,
    paymentType: effectiveType,
  };
}

// ── Create Payment Intent for guest checkout (no auth) ─────────────

export async function createGuestPaymentIntent(
  bookingId: string,
) {
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, unit:units(*, property:properties(*))")
    .eq("id", bookingId)
    .single();

  if (!booking) throw new NotFoundError("Booking not found");

  const settings = await getPaymentSettings();
  const daysToCheckIn = daysUntilDate(booking.check_in_date);

  const effectiveType =
    daysToCheckIn <= settings.fullPaymentThresholdDays ? "FULL" : "DEPOSIT";

  let amountEur: number;
  if (effectiveType === "FULL") {
    amountEur = Number(booking.total_price) || 0;
  } else {
    amountEur = Number(booking.deposit_amount) || Number(booking.total_price) * (settings.depositPercentage / 100);
  }

  const cents = toCents(amountEur);
  if (cents < 50) throw new ValidationError("Payment amount too small (min €0.50)");

  const stripe = getStripe();
  const customerId = await ensureStripeCustomer(
    booking.guest_email,
    booking.guest_name,
    booking.guest_phone,
  );

  const intentParams: Stripe.PaymentIntentCreateParams = {
    amount: cents,
    currency: settings.currency.toLowerCase(),
    customer: customerId,
    metadata: {
      bookingId,
      paymentType: effectiveType,
      bookingNumber: booking.booking_number,
    },
    payment_method_types: ["card"],
  };

  if (effectiveType === "DEPOSIT") {
    intentParams.setup_future_usage = "off_session";
  }

  const paymentIntent = await stripe.paymentIntents.create(intentParams);

  const paymentRecord: Record<string, any> = {
    booking_id: bookingId,
    user_id: booking.user_id || GUEST_USER_ID,
    amount: amountEur,
    currency: settings.currency,
    payment_type: effectiveType,
    stripe_payment_intent_id: paymentIntent.id,
    stripe_customer_id: customerId,
    status: "PENDING",
    description: `${effectiveType} payment for booking ${booking.booking_number}`,
  };

  const { error: insertError } = await supabase.from("payments").insert(paymentRecord);
  if (insertError) {
    console.error(`[PAYMENT] Failed to insert payment record:`, insertError.message);
    throw new Error(`Failed to create payment record: ${insertError.message}`);
  }

  console.log(`[PAYMENT] Payment record created for booking ${booking.booking_number}, PI=${paymentIntent.id}, type=${effectiveType}`);

  await supabase
    .from("bookings")
    .update({ stripe_customer_id: customerId })
    .eq("id", bookingId);

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: amountEur,
    paymentType: effectiveType,
  };
}

// ── Create Payment Intent from Custom Offer (no booking yet) ────────

export async function createPaymentIntentFromOffer(
  offerToken: string,
  guestName: string,
  guestEmail: string,
  guestPhone?: string,
) {
  const { data: offer } = await supabase
    .from("custom_checkout_offers")
    .select("*")
    .eq("token", offerToken)
    .is("used_at", null)
    .single();

  if (!offer) throw new NotFoundError("Offer not found or already used");

  const amountEur = Number(offer.custom_total_eur) || 0;
  const cents = toCents(amountEur);
  if (cents < 50) throw new ValidationError("Payment amount too small (min €0.50)");

  const settings = await getPaymentSettings();
  const stripe = getStripe();
  const customerId = await ensureStripeCustomer(guestEmail, guestName, guestPhone);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: cents,
    currency: settings.currency.toLowerCase(),
    customer: customerId,
    metadata: {
      offerToken: offerToken,
      type: "custom_offer",
    },
    payment_method_types: ["card"],
  });

  const { data: pending, error: pendingErr } = await supabase
    .from("pending_offer_checkouts")
    .insert({
      offer_token: offerToken,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone || null,
      stripe_payment_intent_id: paymentIntent.id,
    })
    .select()
    .single();

  if (pendingErr || !pending) {
    console.error("[PAYMENT] Failed to create pending offer checkout:", pendingErr);
    throw new Error("Failed to create checkout session");
  }

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: amountEur,
    paymentType: "FULL",
  };
}

// ── Create Booking from Offer (after payment success) ────────────────

export async function createBookingFromOffer(paymentIntentId: string, chargeId?: string) {
  const { data: pending } = await supabase
    .from("pending_offer_checkouts")
    .select("*")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .single();

  if (!pending) {
    console.warn("[PAYMENT] No pending offer for PI", paymentIntentId);
    return null;
  }

  const { data: offer } = await supabase
    .from("custom_checkout_offers")
    .select("*")
    .eq("token", pending.offer_token)
    .single();

  if (!offer || offer.used_at) {
    console.warn("[PAYMENT] Offer not found or already used:", pending.offer_token);
    return null;
  }

  const { nanoid: nanoidFn } = await import("nanoid");
  const { randomBytes } = await import("crypto");
  const bookingNumber = `BK${nanoidFn(8).toUpperCase()}`;
  // Parse dates consistently (YYYY-MM-DD noon UTC) to avoid timezone shift
  const parseOfferDate = (s: string) => {
    const str = String(s || "").slice(0, 10);
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 12, 0, 0));
    return new Date(s);
  };
  const checkIn = parseOfferDate(String(offer.check_in_date || ""));
  const checkOut = parseOfferDate(String(offer.check_out_date || ""));
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const customTotal = Number(offer.custom_total_eur) || 0;
  const cancellationToken = randomBytes(32).toString("hex");

  const { data: booking, error: bookErr } = await supabase
    .from("bookings")
    .insert({
      booking_number: bookingNumber,
      unit_id: offer.unit_id,
      user_id: null,
      check_in_date: checkIn.toISOString(),
      check_out_date: checkOut.toISOString(),
      nights,
      base_price: Math.round((customTotal / nights) * 100) / 100,
      total_nights: nights,
      subtotal: customTotal,
      cleaning_fee: 0,
      taxes: 0,
      discount_amount: 0,
      deposit_amount: customTotal,
      balance_amount: 0,
      remaining_amount: 0,
      total_price: customTotal,
      guests: offer.guests,
      guest_name: pending.guest_name,
      guest_email: pending.guest_email,
      guest_phone: pending.guest_phone,
      payment_status: "PENDING",
      payment_type: "FULL",
      deposit_paid: false,
      balance_paid: false,
      status: "PENDING",
      stripe_customer_id: null,
      cancellation_token: cancellationToken,
    })
    .select()
    .single();

  if (bookErr || !booking) {
    console.error("[PAYMENT] Failed to create booking from offer:", bookErr);
    return null;
  }

  await supabase
    .from("payments")
    .insert({
      booking_id: booking.id,
      user_id: "00000000-0000-0000-0000-000000000001",
      amount: customTotal,
      currency: "EUR",
      payment_type: "FULL",
      stripe_payment_intent_id: paymentIntentId,
      stripe_charge_id: chargeId || null,
      stripe_customer_id: null,
      status: "COMPLETED",
      processed_at: new Date().toISOString(),
      description: `Full payment (custom offer) for booking ${bookingNumber}`,
    });

  await supabase
    .from("bookings")
    .update({
      deposit_paid: true,
      balance_paid: true,
      payment_status: "PAID_FULL",
      status: "CONFIRMED",
      total_paid: customTotal,
      remaining_amount: 0,
    })
    .eq("id", booking.id);

  await supabase
    .from("custom_checkout_offers")
    .update({ used_at: new Date().toISOString() })
    .eq("token", pending.offer_token);

  await supabase.from("pending_offer_checkouts").delete().eq("id", pending.id);

  sendEmailsAfterPayment(booking.id, "FULL", { status: "CONFIRMED", payment_status: "PAID_FULL" }).catch((err) =>
    console.error("[PAYMENT] Offer booking email failed:", err),
  );

  return booking;
}

// ── Process Successful Payment (called from webhook) ───────────────

export async function processSuccessfulPayment(
  paymentIntentId: string,
  chargeId?: string,
) {
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.metadata?.type === "custom_offer" || paymentIntent.metadata?.offerToken) {
    const booking = await createBookingFromOffer(paymentIntentId, chargeId);
    return booking ? { type: "offer", booking } : null;
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .single();

  if (!payment) {
    console.warn(`[WEBHOOK] No payment record for PI ${paymentIntentId}`);
    return null;
  }

  if (payment.status === "COMPLETED") {
    console.log(`[WEBHOOK] Payment ${payment.id} already completed, skipping`);
    return payment;
  }

  const updateData: Record<string, any> = {
    status: "COMPLETED",
    processed_at: new Date().toISOString(),
  };

  if (chargeId) updateData.stripe_charge_id = chargeId;
  if (paymentIntent.customer) {
    updateData.stripe_customer_id = paymentIntent.customer as string;
  }

  const { error: payUpdateError } = await supabase.from("payments").update(updateData).eq("id", payment.id);
  if (payUpdateError) {
    console.error(`[PAYMENT] Failed to update payment ${payment.id}:`, payUpdateError.message);
  }

  await updateBookingAfterPayment(payment.booking_id, payment.payment_type, paymentIntent);

  return payment;
}

// ── Update Booking After Payment ───────────────────────────────────

async function updateBookingAfterPayment(
  bookingId: string,
  paymentType: string,
  paymentIntent: Stripe.PaymentIntent,
) {
  console.log(`[BOOKING-UPDATE] Updating booking ${bookingId} after ${paymentType} payment`);

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    console.error(`[BOOKING-UPDATE] Booking ${bookingId} not found!`);
    return;
  }

  const { data: completedPayments } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("status", "COMPLETED");

  const totalPaid = completedPayments?.reduce((s, p) => s + Number(p.amount), 0) || 0;
  const settings = await getPaymentSettings();
  const totalPrice = Number(booking.total_price) || 0;

  console.log(`[BOOKING-UPDATE] totalPaid=${totalPaid}, totalPrice=${totalPrice}, paymentType=${paymentType}`);

  const update: Record<string, any> = { total_paid: totalPaid };

  if (paymentType === "DEPOSIT") {
    update.deposit_paid = true;
    update.payment_status = "DEPOSIT_PAID";
    update.status = "CONFIRMED";

    const scheduledDate = new Date(booking.check_in_date);
    scheduledDate.setDate(scheduledDate.getDate() - settings.balanceChargeDaysBefore);
    update.scheduled_charge_date = scheduledDate.toISOString();
    update.remaining_amount = totalPrice - totalPaid;
    update.payment_type = "DEPOSIT";

    if (paymentIntent.payment_method && typeof paymentIntent.payment_method === "string") {
      update.stripe_payment_method_id = paymentIntent.payment_method;
    }
  } else if (paymentType === "BALANCE") {
    update.balance_paid = true;
    if (totalPaid >= totalPrice * 0.99) {
      update.payment_status = "PAID_FULL";
      update.remaining_amount = 0;
    }
  } else if (paymentType === "FULL") {
    update.deposit_paid = true;
    update.balance_paid = true;
    update.payment_status = "PAID_FULL";
    update.status = "CONFIRMED";
    update.remaining_amount = 0;
    update.payment_type = "FULL";
  }

  if (paymentIntent.customer) {
    update.stripe_customer_id = paymentIntent.customer as string;
  }

  console.log(`[BOOKING-UPDATE] Applying update:`, JSON.stringify(update));
  const { error: updateError } = await supabase.from("bookings").update(update).eq("id", bookingId);
  if (updateError) {
    console.error(`[BOOKING-UPDATE] FAILED to update booking ${bookingId}:`, updateError.message);
  } else {
    console.log(`[BOOKING-UPDATE] Booking ${bookingId} updated successfully — status=${update.status}, payment_status=${update.payment_status}`);

    // Send emails (non-blocking)
    sendEmailsAfterPayment(bookingId, paymentType, update).catch((err) =>
      console.error("[BOOKING-UPDATE] Email send failed:", err),
    );
  }
}

async function sendEmailsAfterPayment(
  bookingId: string,
  paymentType: string,
  update: Record<string, any>,
) {
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, unit:units(*, property:properties(*))")
    .eq("id", bookingId)
    .single();

  if (!booking) return;

  const { data: lastPayment } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("status", "COMPLETED")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!lastPayment) return;

  const guestEmail = booking.guest_email;
  const unit = booking.unit as any;
  const property = unit?.property;
  const bookingForEmail = {
    id: booking.id,
    guestName: booking.guest_name,
    bookingNumber: booking.booking_number,
    checkInDate: booking.check_in_date,
    checkOutDate: booking.check_out_date,
    nights: booking.nights,
    guests: booking.guests,
    totalPrice: Number(booking.total_price),
    cancellationToken: booking.cancellation_token,
    unit: {
      name: unit?.name || "N/A",
      property: { name: property?.name || "N/A" },
    },
  };

  // Always send payment receipt
  await sendPaymentReceiptEmail(
    guestEmail,
    bookingForEmail,
    {
      paymentType: lastPayment.payment_type,
      amount: Number(lastPayment.amount),
      createdAt: lastPayment.created_at,
      stripeChargeId: lastPayment.stripe_charge_id,
    },
    booking.user_id,
  );

  // Send booking confirmation when status becomes CONFIRMED (first payment)
  if (update.status === "CONFIRMED") {
    await sendBookingConfirmationEmail(
      guestEmail,
      bookingForEmail,
      booking.user_id,
    );
  }
}

// ── Refund Payment ─────────────────────────────────────────────────

export async function refundPayment(
  bookingId: string,
  userId?: string,
  reason?: string,
) {
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("status", "COMPLETED")
    .order("created_at", { ascending: false });

  if (!payments || payments.length === 0) {
    throw new NotFoundError("No completed payments found for this booking");
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (!booking) throw new NotFoundError("Booking not found");

  const settings = await getPaymentSettings();
  if (!settings.refundDepositOnCancel) {
    throw new ValidationError("Refund policy is currently disabled");
  }

  const depositPayment = payments.find((p) => p.payment_type === "DEPOSIT");
  if (!depositPayment) throw new NotFoundError("No deposit payment found");
  if (!depositPayment.stripe_payment_intent_id) {
    throw new ValidationError("No Stripe payment intent found for refund");
  }

  const stripe = getStripe();
  const refund = await stripe.refunds.create({
    payment_intent: depositPayment.stripe_payment_intent_id,
    reason: "requested_by_customer",
    metadata: {
      bookingId,
      paymentId: depositPayment.id,
      reason: reason || "Customer requested refund",
    },
  });

  await supabase
    .from("payments")
    .update({
      status: "REFUNDED",
      refund_amount: depositPayment.amount,
      is_refundable: false,
    })
    .eq("id", depositPayment.id);

  await supabase
    .from("bookings")
    .update({
      status: "CANCELLED",
      payment_status: "REFUNDED",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason || "Customer requested cancellation with refund",
    })
    .eq("id", bookingId);

  return {
    refundId: refund.id,
    amount: Number(depositPayment.amount),
    status: refund.status,
  };
}

// ── Handle Stripe Webhook ──────────────────────────────────────────

export async function handleStripeWebhook(event: Stripe.Event) {
  const eventType = event.type;
  console.log(`[WEBHOOK] Processing: ${eventType}`);

  switch (eventType) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const latestCharge = pi.latest_charge;
      const chargeId = typeof latestCharge === "string" ? latestCharge : latestCharge?.id;
      await processSuccessfulPayment(pi.id, chargeId);
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailure(pi.id, pi.last_payment_error?.message);
      break;
    }

    case "charge.succeeded": {
      const charge = event.data.object as Stripe.Charge;
      if (charge.payment_intent) {
        const piId = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent.id;
        await processSuccessfulPayment(piId, charge.id);
      }
      break;
    }

    case "charge.failed": {
      const charge = event.data.object as Stripe.Charge;
      if (charge.payment_intent) {
        const piId = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent.id;
        await handlePaymentFailure(piId, charge.failure_message || undefined);
      }
      break;
    }

    case "charge.dispute.created": {
      const dispute = event.data.object as any;
      await handleDispute(dispute);
      break;
    }

    default:
      console.log(`[WEBHOOK] Unhandled event: ${eventType}`);
  }
}

// ── Handle Payment Failure ─────────────────────────────────────────

async function handlePaymentFailure(paymentIntentId: string, errorMessage?: string) {
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .single();

  if (!payment) return;

  await supabase
    .from("payments")
    .update({
      status: "FAILED",
      last_error: errorMessage || "Payment failed",
      failure_count: (payment.failure_count || 0) + 1,
    })
    .eq("id", payment.id);
}

// ── Handle Dispute ─────────────────────────────────────────────────

async function handleDispute(charge: any) {
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("stripe_charge_id", charge.id)
    .single();

  if (!payment) return;

  await supabase
    .from("payments")
    .update({
      status: "DISPUTED",
      last_error: `Payment disputed: ${charge.reason}`,
    })
    .eq("id", payment.id);
}

// ── Charge scheduled balance payments ──────────────────────────────

export async function chargeScheduledPayments() {
  const today = new Date().toISOString().split("T")[0];
  console.log(`[SCHEDULER] Checking for scheduled payments on ${today}`);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("payment_status", "DEPOSIT_PAID")
    .neq("status", "CANCELLED")
    .lte("scheduled_charge_date", new Date().toISOString());

  if (!bookings || bookings.length === 0) {
    console.log("[SCHEDULER] No payments to process");
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const booking of bookings) {
    try {
      const remaining = Number(booking.remaining_amount) || Number(booking.balance_amount) || 0;
      if (remaining <= 0) {
        console.log(`[SCHEDULER] Booking ${booking.booking_number}: no remaining amount`);
        continue;
      }

      if (!booking.stripe_customer_id || !booking.stripe_payment_method_id) {
        console.error(`[SCHEDULER] Booking ${booking.booking_number}: missing Stripe customer/payment method`);
        failed++;
        continue;
      }

      const stripe = getStripe();
      const settings = await getPaymentSettings();
      const cents = toCents(remaining);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: cents,
        currency: settings.currency.toLowerCase(),
        customer: booking.stripe_customer_id,
        payment_method: booking.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        metadata: {
          bookingId: booking.id,
          paymentType: "BALANCE",
          bookingNumber: booking.booking_number,
          scheduledPayment: "true",
        },
      });

      await supabase.from("payments").insert({
        booking_id: booking.id,
        user_id: booking.user_id || "00000000-0000-0000-0000-000000000000",
        amount: remaining,
        currency: settings.currency,
        payment_type: "BALANCE",
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: booking.stripe_customer_id,
        status: paymentIntent.status === "succeeded" ? "COMPLETED" : "PENDING",
        processed_at: paymentIntent.status === "succeeded" ? new Date().toISOString() : null,
        description: `Scheduled balance payment for booking ${booking.booking_number}`,
      });

      if (paymentIntent.status === "succeeded") {
        await supabase.from("bookings").update({
          balance_paid: true,
          payment_status: "PAID_FULL",
          remaining_amount: 0,
          total_paid: Number(booking.total_paid || 0) + remaining,
        }).eq("id", booking.id);

        console.log(`[SCHEDULER] Successfully charged ${remaining} EUR for booking ${booking.booking_number}`);
        processed++;
      }
    } catch (err: any) {
      console.error(`[SCHEDULER] Failed to charge booking ${booking.booking_number}:`, err.message);

      await supabase.from("payments").insert({
        booking_id: booking.id,
        user_id: booking.user_id || "00000000-0000-0000-0000-000000000000",
        amount: Number(booking.remaining_amount) || 0,
        currency: "EUR",
        payment_type: "BALANCE",
        status: "FAILED",
        last_error: err.message,
        failure_count: 1,
        description: `Failed scheduled balance for booking ${booking.booking_number}`,
      });

      failed++;
    }
  }

  console.log(`[SCHEDULER] Completed: ${processed} processed, ${failed} failed`);
  return { processed, failed };
}

// ── Confirm payment status (client-side fallback for webhooks) ─────

export async function confirmPaymentStatus(bookingId: string) {
  console.log(`[CONFIRM] Confirming payment status for booking ${bookingId}`);

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (paymentError) {
    console.error(`[CONFIRM] Payment lookup error:`, paymentError.message);
  }

  if (!payment) {
    console.error(`[CONFIRM] No payment record found for booking ${bookingId}`);
    throw new NotFoundError("No payment found for this booking");
  }

  console.log(`[CONFIRM] Found payment ${payment.id}, status=${payment.status}, PI=${payment.stripe_payment_intent_id}`);

  if (payment.status === "COMPLETED") {
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, status, payment_status")
      .eq("id", bookingId)
      .single();
    console.log(`[CONFIRM] Payment already COMPLETED, booking status=${booking?.status}`);
    return { alreadyConfirmed: true, booking };
  }

  if (!payment.stripe_payment_intent_id) {
    throw new ValidationError("No Stripe payment intent associated");
  }

  const stripe = getStripe();
  const pi = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
  console.log(`[CONFIRM] Stripe PI ${pi.id} status=${pi.status}`);

  if (pi.status === "succeeded") {
    console.log(`[CONFIRM] PaymentIntent ${pi.id} succeeded — updating booking...`);
    const latestCharge = pi.latest_charge;
    const chargeId = typeof latestCharge === "string" ? latestCharge : latestCharge?.id;

    try {
      await processSuccessfulPayment(pi.id, chargeId);
    } catch (processError: any) {
      console.error(`[CONFIRM] processSuccessfulPayment failed:`, processError.message);
      console.log(`[CONFIRM] Applying direct fallback update for booking ${bookingId}...`);
      const payType = payment.payment_type || "FULL";
      const directUpdate: Record<string, any> = {
        status: "CONFIRMED",
        payment_status: payType === "FULL" ? "PAID_FULL" : "DEPOSIT_PAID",
        total_paid: payment.amount,
      };
      if (payType === "FULL") {
        directUpdate.deposit_paid = true;
        directUpdate.balance_paid = true;
        directUpdate.remaining_amount = 0;
      }
      const { error: fallbackErr } = await supabase.from("bookings").update(directUpdate).eq("id", bookingId);
      if (fallbackErr) {
        console.error(`[CONFIRM] Fallback update failed:`, fallbackErr.message);
      }
      await supabase.from("payments").update({ status: "COMPLETED", processed_at: new Date().toISOString() }).eq("id", payment.id);
    }

    const { data: updatedBooking } = await supabase
      .from("bookings")
      .select("id, status, payment_status, booking_number")
      .eq("id", bookingId)
      .single();

    console.log(`[CONFIRM] Booking updated: status=${updatedBooking?.status}, payment=${updatedBooking?.payment_status}`);
    return { confirmed: true, booking: updatedBooking };
  }

  console.warn(`[CONFIRM] PI ${pi.id} not succeeded yet: status=${pi.status}`);

  if (pi.status === "requires_payment_method" || pi.status === "canceled") {
    return { confirmed: false, status: pi.status, message: "Payment was not completed" };
  }

  return { confirmed: false, status: pi.status, message: `Payment status: ${pi.status}` };
}

// ── Query helpers ──────────────────────────────────────────────────

export async function getPaymentById(paymentId: string) {
  const { data } = await supabase
    .from("payments")
    .select("*, booking:bookings(*, unit:units(*, property:properties(*)))")
    .eq("id", paymentId)
    .single();
  if (!data) throw new NotFoundError("Payment not found");
  return data;
}

export async function getUserPayments(userId: string) {
  const { data } = await supabase
    .from("payments")
    .select("*, booking:bookings(*, unit:units(*, property:properties(*)))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getPaymentHistory(bookingId: string) {
  const { data } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });
  return data || [];
}

export { getPaymentSettings };
