/**
 * Stripe Integration Foundation for LEONIDIONHOUSES
 * 
 * TO SET UP STRIPE:
 * 1. Install @stripe/react-stripe-js:
 *    npm install @stripe/react-stripe-js @stripe/js
 * 
 * 2. Get your Stripe Publishable Key from https://dashboard.stripe.com/keys
 * 
 * 3. Create a .env.local file with:
 *    VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
 * 
 * 4. Create backend endpoints in server/routes/payments.ts for:
 *    - POST /api/create-payment-intent
 *    - POST /api/confirm-payment
 *    - POST /api/refund-payment
 */

// Stripe configuration
export const STRIPE_CONFIG = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  apiVersion: '2024-01-01',
};

// Payment intents configuration
export const PAYMENT_CONFIG = {
  // 25% deposit at booking
  depositPercentage: 0.25,
  // Charge remaining 75% 30 days before check-in
  remainingDaysBeforeCharge: 30,
  // Currency
  currency: 'usd',
} as const;

/**
 * Calculate payment amounts based on total booking cost
 */
export function calculatePaymentAmounts(totalCost: number) {
  const depositAmount = Math.round(totalCost * PAYMENT_CONFIG.depositPercentage);
  const remainingAmount = totalCost - depositAmount;

  return {
    totalAmount: totalCost,
    depositAmount,
    remainingAmount,
    depositPercentage: (PAYMENT_CONFIG.depositPercentage * 100).toFixed(0),
    remainingPercentage: ((1 - PAYMENT_CONFIG.depositPercentage) * 100).toFixed(0),
  };
}

/**
 * Calculate refund based on cancellation policy
 */
export function calculateRefund(
  totalCost: number,
  daysBeforeCheckIn: number,
): {
  refundAmount: number;
  retainedAmount: number;
  policy: string;
} {
  let refundPercentage = 0;
  let policy = '';

  if (daysBeforeCheckIn > 60) {
    // Cancel more than 60 days before: keep 25% (the deposit)
    refundPercentage = 0.75;
    policy = 'Cancel >60 days: 75% refund, 25% retained';
  } else if (daysBeforeCheckIn > 30) {
    // Cancel 30-60 days before: keep 50%
    refundPercentage = 0.50;
    policy = 'Cancel 30-60 days: 50% refund, 50% retained';
  } else {
    // Cancel less than 30 days before: no refund
    refundPercentage = 0;
    policy = 'Cancel <30 days: No refund';
  }

  const refundAmount = Math.round(totalCost * refundPercentage);
  const retainedAmount = totalCost - refundAmount;

  return {
    refundAmount,
    retainedAmount,
    policy,
  };
}

/**
 * Type definitions for payment data
 */
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
  status: 'pending' | 'deposit_paid' | 'completed' | 'refunded';
  depositPaymentIntentId?: string;
  remainingPaymentIntentId?: string;
  remainingPaymentDueDate?: Date;
  refundId?: string;
}

/**
 * Stripe API endpoints
 */
export const STRIPE_ENDPOINTS = {
  createPaymentIntent: '/api/create-payment-intent',
  confirmPayment: '/api/confirm-payment',
  refundPayment: '/api/refund-payment',
  webhookEvents: '/api/webhook/stripe',
} as const;
