import "dotenv/config";
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
import viewVideosRouter from "./routes/viewvideos";
// import { startScheduler } from "./services/scheduler";

export function createServer() {
  const app = express();

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve static files from uploads directory
  app.use("/uploads", express.static(uploadsDir));

  // Configure multer for file uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files are allowed'));
    },
  });

  // Accept any file field - fixes "Unexpected field" (client may send various field names)
  const uploadAny = upload.any();

  app.locals.upload = upload;
  app.locals.uploadAny = uploadAny;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // Serve view videos from public/viewvideos via API (guaranteed correct path)
  app.use("/api/viewvideos", viewVideosRouter);

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
  app.use("/api/properties", propertiesRouter);
  app.use("/api/units", unitsRouter);

  // Start payment scheduler
  if (process.env.NODE_ENV !== "test") {
    // startScheduler(); // TODO: Implement with Supabase
  }

  return app;
}
