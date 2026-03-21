import "./lib/env";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { handleDemo } from "./routes/demo";
import { paymentRouter } from "./routes/payments";
import { adminRouter } from "./routes/admin";
import { authRouter } from "./routes/auth";
import { bookingRouter } from "./routes/bookings";
import { propertiesRouter } from "./routes/properties";
import { unitsRouter } from "./routes/units";
import { inquiryRouter } from "./routes/inquiries";
import { cancelBookingRouter } from "./routes/cancel-booking";
import viewVideosRouter from "./routes/viewvideos";
import { startScheduler } from "./services/scheduler";
import { errorHandler } from "./middleware/error";

function validateStripeConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║         STRIPE CONFIGURATION STATUS          ║");
  console.log("╠══════════════════════════════════════════════╣");

  if (!secretKey) {
    console.log("║ ✗ STRIPE_SECRET_KEY          — MISSING       ║");
    console.log("║   Add sk_test_... to .env                    ║");
  } else {
    const isTest = secretKey.startsWith("sk_test_");
    console.log(`║ ✓ STRIPE_SECRET_KEY          — ${isTest ? "TEST MODE" : "LIVE MODE"}   ║`);
  }

  if (!publishableKey) {
    console.log("║ ✗ STRIPE_PUBLISHABLE_KEY     — MISSING       ║");
  } else {
    console.log("║ ✓ STRIPE_PUBLISHABLE_KEY     — SET           ║");
  }

  if (!webhookSecret) {
    console.log("║ ⚠ STRIPE_WEBHOOK_SECRET      — NOT SET       ║");
    console.log("║                                              ║");
    console.log("║   Webhooks will be accepted WITHOUT          ║");
    console.log("║   signature verification.                    ║");
    console.log("║                                              ║");
    console.log("║   To enable verification:                    ║");
    console.log("║   Dev: stripe listen --forward-to localhost  ║");
    console.log("║   Prod: add endpoint in Stripe Dashboard     ║");
    console.log("║   2. Copy the whsec_... secret               ║");
    console.log("║   3. Set STRIPE_WEBHOOK_SECRET in .env       ║");
    console.log("║   4. Restart the server                      ║");
  } else {
    console.log("║ ✓ STRIPE_WEBHOOK_SECRET      — SET           ║");
  }

  console.log("╚══════════════════════════════════════════════╝\n");
}

export function createServer() {
  const app = express();

  if (process.env.NODE_ENV !== "test") {
    validateStripeConfig();
  }

  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.use("/uploads", express.static(uploadsDir));

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      if (file.mimetype.startsWith("image/")) cb(null, true);
      else cb(new Error("Only image files are allowed"));
    },
  });

  const uploadAny = upload.any();
  app.locals.upload = upload;
  app.locals.uploadAny = uploadAny;

  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "production" && process.env.FRONTEND_URL
          ? [process.env.FRONTEND_URL, "https://www.leonidion-houses.com", "https://leonidion-houses.com"]
          : true,
      credentials: true,
    }),
  );

  // Stripe webhook needs raw body — register BEFORE express.json()
  app.use(
    "/api/payments/webhook",
    express.raw({ type: "application/json" }),
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use((req, _res, next) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[${req.method}] ${req.url}`);
    }
    next();
  });

  app.use("/uploads", express.static(uploadsDir));
  app.use("/api/viewvideos", viewVideosRouter);

  app.get("/api/ping", (_req, res) => {
    res.json({ message: process.env.PING_MESSAGE ?? "ping" });
  });
  app.get("/api/demo", handleDemo);

  app.use("/api/payments", paymentRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/bookings", bookingRouter);
  app.use("/api/properties", propertiesRouter);
  app.use("/api/units", unitsRouter);
  app.use("/api/inquiries", inquiryRouter);
  app.use("/api/cancel-booking", cancelBookingRouter);

  app.use(errorHandler);

  if (process.env.NODE_ENV !== "test") {
    startScheduler();
  }

  return app;
}
