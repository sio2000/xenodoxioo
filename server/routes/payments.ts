
import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { validate } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import * as paymentService from "../services/payment.service";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-01-01",
});

// Schemas
const createIntentSchema = z.object({
  bookingId: z.string(),
  paymentType: z.enum(["DEPOSIT", "BALANCE", "FULL"]).optional(),
});

const refundSchema = z.object({
  bookingId: z.string(),
  reason: z.string().optional(),
});

// Create Payment Intent
router.post(
  "/create-intent",
  authenticate,
  validate(createIntentSchema),
  async (req, res, next) => {
    try {
      const { bookingId, paymentType } = req.body;
      const result = await paymentService.createPaymentIntent(
        bookingId,
        req.user!.userId,
        paymentType,
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
);

// Refund Payment
router.post(
  "/refund",
  authenticate,
  validate(refundSchema),
  async (req, res, next) => {
    try {
      const { bookingId, reason } = req.body;
      const result = await paymentService.refundPayment(
        bookingId,
        req.user!.userId,
        reason,
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
);

// Get Payment History
router.get("/history/:bookingId", authenticate, async (req, res, next) => {
  try {
    const result = await paymentService.getPaymentHistory(req.params.bookingId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Stripe Webhook
// NOTE: This route needs raw body for signature verification.
router.post(
  "/webhook",
  async (req: Request, res: Response, next: NextFunction) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      console.error("Missing signature or webhook secret");
      res.status(400).send("Webhook Error: Missing signature or secret");
      return;
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook Signature Verification Failed: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    try {
      await paymentService.handleStripeWebhook(event);
      res.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  },
);

export const paymentRouter = router;
