import {
  PaymentIntentData,
  STRIPE_ENDPOINTS,
  calculatePaymentAmounts,
} from "./stripe";

/**
 * Payment Service
 * Handles all payment-related API calls
 */

export interface CreatePaymentIntentRequest {
  amount: number;
  bookingData: {
    propertyId: string;
    checkInDate: string;
    checkOutDate: string;
    guestName: string;
    guestEmail: string;
    nights: number;
    pricePerNight: number;
  };
}

export interface PaymentResponse {
  success: boolean;
  clientSecret?: string;
  error?: string;
  paymentIntentId?: string;
}

/**
 * Create a payment intent for the deposit
 * @param request - Payment request data
 * @returns Payment intent client secret
 */
export async function createPaymentIntent(
  request: CreatePaymentIntentRequest,
): Promise<PaymentResponse> {
  try {
    const response = await fetch(STRIPE_ENDPOINTS.createPaymentIntent, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error("Failed to create payment intent");
    }

    const data: PaymentResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Confirm a payment
 * @param paymentIntentId - Stripe payment intent ID
 * @returns Confirmation response
 */
export async function confirmPayment(
  paymentIntentId: string,
): Promise<PaymentResponse> {
  try {
    const response = await fetch(STRIPE_ENDPOINTS.confirmPayment, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentIntentId,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to confirm payment");
    }

    const data: PaymentResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error confirming payment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Refund a payment
 * @param paymentIntentId - Stripe payment intent ID
 * @param amount - Optional specific amount to refund (if not provided, full refund)
 * @returns Refund response
 */
export async function refundPayment(
  paymentIntentId: string,
  amount?: number,
): Promise<PaymentResponse> {
  try {
    const response = await fetch(STRIPE_ENDPOINTS.refundPayment, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentIntentId,
        amount,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refund payment");
    }

    const data: PaymentResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error refunding payment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Schedule remaining balance payment
 * This would be called on the server to schedule a payment 30 days before check-in
 */
export async function scheduleRemainingPayment(
  bookingId: string,
  checkInDate: Date,
): Promise<PaymentResponse> {
  try {
    const response = await fetch("/api/schedule-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bookingId,
        checkInDate,
        daysBeforeCheckIn: 30,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to schedule payment");
    }

    const data: PaymentResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error scheduling payment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get payment history for a booking
 */
export async function getPaymentHistory(bookingId: string) {
  try {
    const response = await fetch(`/api/payments/${bookingId}`);

    if (!response.ok) {
      throw new Error("Failed to fetch payment history");
    }

    const data = await response.json();
    return {
      success: true,
      payments: data,
    };
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
