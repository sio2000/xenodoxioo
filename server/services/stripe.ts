import Stripe from 'stripe';
import { supabase } from '../lib/db';

// Only initialize Stripe if we have the required environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY not found in environment variables');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-01-01' as any,
  typescript: true,
}) : null;

export class StripeService {
  static async createCustomer(email: string, name: string, phone?: string) {
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        phone,
        metadata: {
          source: 'booking_platform'
        }
      });

      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  static async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    customerId?: string,
    metadata?: Record<string, string>,
    paymentMethodTypes: string[] = ['card']
  ) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customerId,
        metadata,
        payment_method_types: paymentMethodTypes,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  static async retrievePaymentIntent(paymentIntentId: string) {
    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw error;
    }
  }

  static async confirmPaymentIntent(paymentIntentId: string) {
    try {
      return await stripe.paymentIntents.confirm(paymentIntentId);
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      throw error;
    }
  }

  static async cancelPaymentIntent(paymentIntentId: string) {
    try {
      return await stripe.paymentIntents.cancel(paymentIntentId);
    } catch (error) {
      console.error('Error canceling payment intent:', error);
      throw error;
    }
  }

  static async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: Stripe.RefundCreateParams.Reason
  ) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason,
      });

      return refund;
    } catch (error) {
      console.error('Error creating refund:', error);
      throw error;
    }
  }

  static async retrieveCharge(chargeId: string) {
    try {
      return await stripe.charges.retrieve(chargeId);
    } catch (error) {
      console.error('Error retrieving charge:', error);
      throw error;
    }
  }

  static async constructWebhookEvent(
    payload: string,
    signature: string,
    secret: string
  ): Promise<Stripe.Event> {
    try {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      console.error('Error constructing webhook event:', error);
      throw error;
    }
  }

  static async updatePaymentIntent(
    paymentIntentId: string,
    updates: Stripe.PaymentIntentUpdateParams
  ) {
    try {
      return await stripe.paymentIntents.update(paymentIntentId, updates);
    } catch (error) {
      console.error('Error updating payment intent:', error);
      throw error;
    }
  }

  static async createPaymentMethod(
    paymentMethodType: Stripe.PaymentMethodCreateParams.Type,
    paymentMethodData: Omit<Stripe.PaymentMethodCreateParams, 'type'>
  ) {
    try {
      return await stripe.paymentMethods.create({
        type: paymentMethodType,
        ...paymentMethodData,
      });
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw error;
    }
  }

  static async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ) {
    try {
      return await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    } catch (error) {
      console.error('Error attaching payment method:', error);
      throw error;
    }
  }

  // Helper method to format amount for display
  static formatAmount(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  // Helper method to convert amount to cents for Stripe
  static toCents(amount: number): number {
    return Math.round(amount * 100);
  }

  // Helper method to convert cents from Stripe to amount
  static fromCents(cents: number): number {
    return cents / 100;
  }
}

export default StripeService;
