export const STRIPE_CONFIG = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
  apiVersion: "2024-01-01",
};

export const PAYMENT_CONFIG = {
  depositPercentage: 0.25,
  fullPaymentThresholdDays: 21,
  currency: "eur",
} as const;

export function calculatePaymentAmounts(totalCost: number, depositPct = PAYMENT_CONFIG.depositPercentage) {
  const depositAmount = Math.round(totalCost * depositPct * 100) / 100;
  const remainingAmount = Math.round((totalCost - depositAmount) * 100) / 100;
  return {
    totalAmount: totalCost,
    depositAmount,
    remainingAmount,
    depositPercentage: (depositPct * 100).toFixed(0),
    remainingPercentage: ((1 - depositPct) * 100).toFixed(0),
  };
}

export interface PaymentIntentData {
  amount: number;
  currency: string;
  bookingId: string;
  propertyId: string;
  guestEmail: string;
  guestName: string;
  metadata?: Record<string, string>;
}

export interface BookingPayment {
  bookingId: string;
  propertyId: string;
  guestId: string;
  depositAmount: number;
  remainingAmount: number;
  totalAmount: number;
  currency: string;
  status: "pending" | "deposit_paid" | "paid_full" | "refunded";
  depositPaymentIntentId?: string;
  remainingPaymentIntentId?: string;
  remainingPaymentDueDate?: Date;
  refundId?: string;
}

export const STRIPE_ENDPOINTS = {
  createPaymentIntent: "/api/payments/create-intent",
  createGuestPaymentIntent: "/api/payments/create-guest-intent",
  refundPayment: "/api/payments/refund",
  webhookEvents: "/api/payments/webhook",
  paymentHistory: "/api/payments/history",
} as const;
