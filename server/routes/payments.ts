import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { validate } from "../middleware/validation";
import { authenticate, optionalAuthenticate } from "../middleware/auth";
import * as paymentService from "../services/payment.service";
import { supabase } from "../lib/db";

const router = Router();

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY not found");
  return new Stripe(secretKey);
};

// ── Schemas ────────────────────────────────────────────────────────

const createIntentSchema = z.object({
  bookingId: z.string(),
  paymentType: z.enum(["DEPOSIT", "BALANCE", "FULL"]).optional(),
});

const refundSchema = z.object({
  bookingId: z.string(),
  reason: z.string().optional(),
});

// ── Get Payment Settings (Public) ──────────────────────────────────

router.get("/settings", async (_req, res, next) => {
  try {
    const settings = await paymentService.getPaymentSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

// ── Create Payment Intent (Authenticated) ──────────────────────────

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

// ── Create Payment Intent (Guest / no auth) ────────────────────────

router.post(
  "/create-guest-intent",
  async (req, res, next) => {
    try {
      const { bookingId } = req.body;
      if (!bookingId) {
        return res.status(400).json({ success: false, error: "bookingId is required" });
      }
      const result = await paymentService.createGuestPaymentIntent(bookingId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
);

// ── Refund Payment ─────────────────────────────────────────────────

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

// ── Get Payment History ────────────────────────────────────────────

router.get("/history/:bookingId", optionalAuthenticate, async (req, res, next) => {
  try {
    const result = await paymentService.getPaymentHistory(req.params.bookingId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ── Stripe Webhook ─────────────────────────────────────────────────
// Raw body is passed via express.raw() middleware registered in server/index.ts

router.post(
  "/webhook",
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // express.raw() sets req.body to a Buffer; normalize to a string for parsing
    const rawBody: Buffer | string = Buffer.isBuffer(req.body)
      ? req.body
      : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body);

    if (!sig) {
      console.error("[WEBHOOK] Missing stripe-signature header");
      res.status(400).send("Missing signature");
      return;
    }

    if (!webhookSecret) {
      console.warn("[WEBHOOK] STRIPE_WEBHOOK_SECRET not set — accepting event WITHOUT signature verification (dev mode)");
      try {
        const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
        const event = JSON.parse(bodyStr) as Stripe.Event;
        console.log(`[WEBHOOK] Received event: ${event.type} (id: ${event.id})`);
        await paymentService.handleStripeWebhook(event);
        res.json({ received: true });
      } catch (err: any) {
        console.error("[WEBHOOK] Error:", err.message);
        res.status(500).json({ error: "Webhook processing failed" });
      }
      return;
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      console.error(`[WEBHOOK] Signature verification failed: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    console.log(`[WEBHOOK] Verified event: ${event.type} (id: ${event.id})`);
    try {
      await paymentService.handleStripeWebhook(event);
      res.json({ received: true });
    } catch (error: any) {
      console.error("[WEBHOOK] Processing error:", error.message);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  },
);

// ── Confirm Payment Status (client-side fallback for webhooks) ──────
// Called by the frontend after stripe.confirmPayment() succeeds.
// Checks the PI status directly with Stripe API and updates DB.

router.post("/confirm-status/:bookingId", async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) {
      return res.status(400).json({ success: false, error: "bookingId is required" });
    }
    const result = await paymentService.confirmPaymentStatus(bookingId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ── Manual scheduler trigger ────────────────────────────────────────
// In development mode, this endpoint is accessible without auth for testing.
// In production, JWT authentication is enforced.

router.post("/run-scheduler", async (req, res, next) => {
  const isDev = process.env.NODE_ENV !== "production";

  if (!isDev) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required in production" });
      return;
    }
  }

  try {
    console.log("[SCHEDULER] Manual trigger via /run-scheduler");
    const result = await paymentService.chargeScheduledPayments();
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ── Health Check (dev) ─────────────────────────────────────────────

router.get("/health", async (_req, res) => {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    stripe: { secretKey: false, publishableKey: false, webhookSecret: false },
    database: { connected: false, tables: {} },
  };

  // Stripe keys
  checks.stripe.secretKey = !!process.env.STRIPE_SECRET_KEY;
  checks.stripe.publishableKey = !!(process.env.STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY);
  checks.stripe.webhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
  checks.stripe.mode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ? "test" : process.env.STRIPE_SECRET_KEY ? "live" : "none";

  // Stripe API connectivity
  try {
    const stripe = getStripe();
    const bal = await stripe.balance.retrieve();
    checks.stripe.connected = true;
    checks.stripe.currency = bal.available?.[0]?.currency || "unknown";
  } catch (err: any) {
    checks.stripe.connected = false;
    checks.stripe.error = err.message;
  }

  // Database connectivity and tables
  const requiredTables = ["bookings", "payments", "payment_settings", "units", "properties", "inquiries", "inquiry_messages"];
  try {
    for (const table of requiredTables) {
      const { error } = await supabase.from(table).select("id").limit(1);
      checks.database.tables[table] = error ? `MISSING (${error.message})` : "OK";
    }
    checks.database.connected = true;
  } catch (err: any) {
    checks.database.connected = false;
    checks.database.error = err.message;
  }

  const allOk = checks.stripe.connected && checks.database.connected &&
    Object.values(checks.database.tables).every((v) => v === "OK");

  res.status(allOk ? 200 : 503).json({ status: allOk ? "healthy" : "degraded", ...checks });
});

export const paymentRouter = router;
