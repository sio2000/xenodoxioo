import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const GUEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : event.body || {};
  const bookingId = body.bookingId;

  if (!bookingId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: "bookingId is required" }),
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

  try {
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, unit:units(*, property:properties(*))")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "Booking not found" }),
      };
    }

    let depositPct = 25;
    let fullPaymentThresholdDays = 21;
    try {
      const { data: settings } = await supabase
        .from("payment_settings")
        .select("*")
        .eq("is_active", true)
        .single();
      if (settings) {
        depositPct = Number(settings.deposit_percentage) || 25;
        fullPaymentThresholdDays = Number(settings.full_payment_threshold_days) || 21;
      }
    } catch { /* use defaults */ }

    const checkIn = new Date(booking.check_in_date);
    const daysToCheckIn = Math.ceil((checkIn.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const effectiveType = daysToCheckIn <= fullPaymentThresholdDays ? "FULL" : "DEPOSIT";

    let amountEur: number;
    if (effectiveType === "FULL") {
      amountEur = Number(booking.total_price) || 0;
    } else {
      amountEur = Number(booking.deposit_amount) || Number(booking.total_price) * (depositPct / 100);
    }

    const cents = Math.round(amountEur * 100);
    if (cents < 50) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "Payment amount too small" }),
      };
    }

    let customerId: string;
    const existing = await stripe.customers.list({ email: booking.guest_email, limit: 1 });
    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: booking.guest_email,
        name: booking.guest_name,
        phone: booking.guest_phone || undefined,
        metadata: { source: "booking_platform" },
      });
      customerId = customer.id;
    }

    const intentParams: Stripe.PaymentIntentCreateParams = {
      amount: cents,
      currency: "eur",
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

    await supabase.from("payments").insert({
      booking_id: bookingId,
      user_id: booking.user_id || GUEST_USER_ID,
      amount: amountEur,
      currency: "EUR",
      payment_type: effectiveType,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_customer_id: customerId,
      status: "PENDING",
      description: `${effectiveType} payment for booking ${booking.booking_number}`,
    });

    await supabase
      .from("bookings")
      .update({ stripe_customer_id: customerId })
      .eq("id", bookingId);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: amountEur,
          paymentType: effectiveType,
        },
      }),
    };
  } catch (err: any) {
    console.error("[create-guest-payment-intent] Error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
