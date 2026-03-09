import { apiUrl } from "./api";
import { STRIPE_ENDPOINTS } from "./stripe";

export interface PaymentResponse {
  success: boolean;
  clientSecret?: string;
  error?: string;
  paymentIntentId?: string;
  amount?: number;
  paymentType?: string;
}

export async function createPaymentIntent(
  bookingId: string,
  paymentType?: "DEPOSIT" | "BALANCE" | "FULL",
  accessToken?: string,
): Promise<PaymentResponse> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const endpoint = accessToken
      ? STRIPE_ENDPOINTS.createPaymentIntent
      : STRIPE_ENDPOINTS.createGuestPaymentIntent;

    const response = await fetch(apiUrl(endpoint), {
      method: "POST",
      headers,
      body: JSON.stringify({ bookingId, paymentType }),
    });

    if (!response.ok) throw new Error("Failed to create payment intent");
    const data = await response.json();
    return { success: true, ...data.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function refundPayment(
  bookingId: string,
  reason?: string,
  accessToken?: string,
): Promise<PaymentResponse> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const response = await fetch(apiUrl(STRIPE_ENDPOINTS.refundPayment), {
      method: "POST",
      headers,
      body: JSON.stringify({ bookingId, reason }),
    });

    if (!response.ok) throw new Error("Failed to refund payment");
    const data = await response.json();
    return { success: true, ...data.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getPaymentHistory(bookingId: string) {
  try {
    const response = await fetch(apiUrl(`${STRIPE_ENDPOINTS.paymentHistory}/${bookingId}`));
    if (!response.ok) throw new Error("Failed to fetch payment history");
    const data = await response.json();
    return { success: true, payments: data.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
