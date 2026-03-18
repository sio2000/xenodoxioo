import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const path = event.path || event.rawPath || "";
  const match = path.match(/\/api\/payments\/confirm-status\/([^/]+)/);
  const bookingId = match?.[1];

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
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (paymentError || !payment) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "No payment found" }),
      };
    }

    if (payment.status === "COMPLETED") {
      const { data: booking } = await supabase.from("bookings").select("id, status, payment_status").eq("id", bookingId).single();
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, data: { alreadyConfirmed: true, booking } }),
      };
    }

    if (!payment.stripe_payment_intent_id) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "No Stripe payment intent" }),
      };
    }

    const pi = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);

    if (pi.status === "succeeded") {
      const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
      await supabase.from("payments").update({
        status: "COMPLETED",
        processed_at: new Date().toISOString(),
        stripe_charge_id: chargeId,
      }).eq("id", payment.id);

      const payType = payment.payment_type || "FULL";
      const directUpdate: Record<string, any> = {
        status: "CONFIRMED",
        payment_status: payType === "FULL" ? "PAID_FULL" : "DEPOSIT_PAID",
        total_paid: Number(payment.amount),
      };
      if (payType === "FULL") {
        directUpdate.deposit_paid = true;
        directUpdate.balance_paid = true;
        directUpdate.remaining_amount = 0;
      }
      await supabase.from("bookings").update(directUpdate).eq("id", bookingId);

      const { data: updatedBooking } = await supabase
        .from("bookings")
        .select("id, status, payment_status, booking_number")
        .eq("id", bookingId)
        .single();

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, data: { confirmed: true, booking: updatedBooking } }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        data: { confirmed: false, status: pi.status, message: `Payment status: ${pi.status}` },
      }),
    };
  } catch (err: any) {
    console.error("[confirm-payment-status] Error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
