import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const GUEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const handler = async (event: any) => {
  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig) {
    console.error("[WEBHOOK] Missing stripe-signature header");
    return { statusCode: 400, body: "Missing signature" };
  }

  const rawBody = typeof event.body === "string" ? event.body : JSON.stringify(event.body || {});

  if (!webhookSecret) {
    console.warn("[WEBHOOK] STRIPE_WEBHOOK_SECRET not set — rejecting in production");
    return { statusCode: 500, body: "Webhook not configured" };
  }

  let stripeEvent: Stripe.Event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("[WEBHOOK] Signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  console.log("[WEBHOOK] Verified event:", stripeEvent.type, stripeEvent.id);

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

  try {
    if (stripeEvent.type === "payment_intent.succeeded") {
      const pi = stripeEvent.data.object as Stripe.PaymentIntent;
      const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
      await processSuccessfulPayment(supabase, stripe, pi.id, chargeId);
    } else if (stripeEvent.type === "charge.succeeded") {
      const charge = stripeEvent.data.object as Stripe.Charge;
      if (charge.payment_intent) {
        const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent.id;
        await processSuccessfulPayment(supabase, stripe, piId, charge.id);
      }
    }
  } catch (err: any) {
    console.error("[WEBHOOK] Processing error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

async function processSuccessfulPayment(
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe,
  paymentIntentId: string,
  chargeId?: string
) {
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .single();

  if (!payment) {
    console.warn("[WEBHOOK] No payment record for PI", paymentIntentId);
    return;
  }

  if (payment.status === "COMPLETED") return;

  await supabase
    .from("payments")
    .update({
      status: "COMPLETED",
      processed_at: new Date().toISOString(),
      stripe_charge_id: chargeId || null,
    })
    .eq("id", payment.id);

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, unit:units(*, property:properties(*))")
    .eq("id", payment.booking_id)
    .single();

  if (!booking) return;

  const { data: completedPayments } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_id", booking.id)
    .eq("status", "COMPLETED");

  const totalPaid = completedPayments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
  const totalPrice = Number(booking.total_price) || 0;

  const update: Record<string, any> = { total_paid: totalPaid };

    if (payment.payment_type === "DEPOSIT") {
    update.deposit_paid = true;
    update.payment_status = "DEPOSIT_PAID";
    update.status = "CONFIRMED";
    const checkIn = new Date(booking.check_in_date);
    checkIn.setDate(checkIn.getDate() - 21);
    update.scheduled_charge_date = checkIn.toISOString();
    update.remaining_amount = totalPrice - totalPaid;
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.payment_method && typeof pi.payment_method === "string") {
      update.stripe_payment_method_id = pi.payment_method;
    }
  } else if (payment.payment_type === "BALANCE") {
    update.balance_paid = true;
    if (totalPaid >= totalPrice * 0.99) update.payment_status = "PAID_FULL";
  } else if (payment.payment_type === "FULL") {
    update.deposit_paid = true;
    update.balance_paid = true;
    update.payment_status = "PAID_FULL";
    update.status = "CONFIRMED";
    update.remaining_amount = 0;
  }

  await supabase.from("bookings").update(update).eq("id", booking.id);

  // Send emails via Resend
  const frontendUrl = process.env.FRONTEND_URL || "https://www.leonidion-houses.com";
  const unit = booking.unit as any;
  const property = unit?.property;
  const bookingForEmail = {
    guestName: booking.guest_name,
    bookingNumber: booking.booking_number,
    checkInDate: booking.check_in_date,
    checkOutDate: booking.check_out_date,
    nights: booking.nights,
    guests: booking.guests,
    totalPrice: Number(booking.total_price),
    unit: { name: unit?.name || "N/A", property: { name: property?.name || "N/A" } },
  };

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = new Resend(apiKey);
    const from = `${process.env.FROM_NAME || "LEONIDIONHOUSES"} <${process.env.FROM_EMAIL || "onboarding@resend.dev"}>`;

    await resend.emails.send({
      from,
      to: booking.guest_email,
      subject: `Payment Receipt - ${booking.booking_number}`,
      html: `
        <h1>Payment Receipt</h1>
        <p>Dear ${bookingForEmail.guestName},</p>
        <p>Your payment has been successfully processed.</p>
        <ul>
          <li><strong>Booking:</strong> ${bookingForEmail.bookingNumber}</li>
          <li><strong>Amount:</strong> €${payment.amount?.toFixed(2)}</li>
        </ul>
        <a href="${frontendUrl}/dashboard" style="background:#0677A1;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">View Booking</a>
        <p>Best regards,<br/>LEONIDIONHOUSES</p>
      `,
    });

    if (update.status === "CONFIRMED") {
      await resend.emails.send({
        from,
        to: booking.guest_email,
        subject: `Booking Confirmation - ${booking.booking_number}`,
        html: `
          <h1>Booking Confirmation</h1>
          <p>Dear ${bookingForEmail.guestName},</p>
          <p>Thank you for booking with LEONIDIONHOUSES!</p>
          <ul>
            <li><strong>Booking:</strong> ${bookingForEmail.bookingNumber}</li>
            <li><strong>Room:</strong> ${bookingForEmail.unit?.property?.name}</li>
            <li><strong>Check-in:</strong> ${new Date(bookingForEmail.checkInDate).toLocaleDateString()}</li>
            <li><strong>Check-out:</strong> ${new Date(bookingForEmail.checkOutDate).toLocaleDateString()}</li>
            <li><strong>Total:</strong> €${bookingForEmail.totalPrice?.toFixed(2)}</li>
          </ul>
          <a href="${frontendUrl}/dashboard" style="background:#0677A1;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">View Booking</a>
          <p>Best regards,<br/>LEONIDIONHOUSES</p>
        `,
      });
    }
  }
}
