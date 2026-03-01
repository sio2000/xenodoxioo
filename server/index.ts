import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { paymentRouter } from "./routes/payments";
import { adminRouter } from "./routes/admin";
import { authRouter } from "./routes/auth";
import { bookingRouter } from "./routes/bookings";
import PaymentScheduler from "./services/scheduler";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // API routes
  app.use("/api/payments", paymentRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/bookings", bookingRouter);

  // Start payment scheduler
  if (process.env.NODE_ENV !== "test") {
    PaymentScheduler.start();
  }

  return app;
}
