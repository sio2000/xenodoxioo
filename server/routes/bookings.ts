import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validation";
import { authenticate, optionalAuthenticate } from "../middleware/auth";
import * as bookingService from "../services/booking.service";

const router = Router();

// ── Schemas ────────────────────────────────────────────────────────

const checkAvailabilitySchema = z.object({
  unitId: z.string(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
});

const getAvailableUnitsSchema = z.object({
  checkInDate: z.string(),
  checkOutDate: z.string(),
  guests: z.coerce.number().min(1),
  propertyId: z.string().optional(),
});

const quoteSchema = z.object({
  unitId: z.string(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  guests: z.coerce.number().min(1),
  couponCode: z.string().optional(),
});

const createBookingSchema = z.object({
  unitId: z.string(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  guests: z.number().min(1),
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  guestPhone: z.string().optional(),
  specialRequests: z.string().optional(),
  couponCode: z.string().optional(),
});

const cancelBookingSchema = z.object({
  reason: z.string().optional(),
  guestEmail: z.string().email().optional(),
});

// ── Routes ─────────────────────────────────────────────────────────

router.get("/occupied-dates", async (req, res, next) => {
  try {
    const unitId = req.query.unitId as string;
    if (!unitId) return res.status(400).json({ success: false, error: "unitId required" });
    const ranges = await bookingService.getOccupiedDateRanges(unitId);
    const mapped = (ranges || []).map((r: any) => ({
      start: (r.check_in_date || "").slice(0, 10),
      end: (r.check_out_date || "").slice(0, 10),
    }));
    res.json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
});

router.post("/availability", validate(checkAvailabilitySchema), async (req, res, next) => {
  try {
    const { unitId, checkInDate, checkOutDate } = req.body;
    const result = await bookingService.checkAvailability(unitId, new Date(checkInDate), new Date(checkOutDate));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post("/search", validate(getAvailableUnitsSchema), async (req, res, next) => {
  try {
    const { checkInDate, checkOutDate, guests, propertyId } = req.body;
    const units = await bookingService.getAvailableUnits(checkInDate, checkOutDate, guests, propertyId);
    res.json({ success: true, data: units });
  } catch (error) {
    next(error);
  }
});

// Quote endpoint — uses dynamic tax and payment settings
router.post("/quote", validate(quoteSchema), async (req, res, next) => {
  try {
    const { unitId, checkInDate, checkOutDate, guests, couponCode } = req.body;
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res.status(400).json({ success: false, error: "Invalid dates" });
    }
    if (checkIn >= checkOut) {
      return res.status(400).json({ success: false, error: "Check-out must be after check-in" });
    }

    const pricing = await bookingService.calculateBookingPrice(unitId, checkIn, checkOut, guests, couponCode);

    res.json({
      success: true,
      data: {
        unit: { id: unitId },
        pricing: {
          nights: pricing.nights,
          basePrice: pricing.basePrice,
          subtotal: pricing.subtotal,
          cleaningFee: pricing.cleaningFee,
          discountAmount: pricing.discountAmount,
          taxes: pricing.taxes,
          taxRate: pricing.taxRate,
          totalPrice: pricing.finalTotal,
          depositAmount: pricing.depositAmount,
          balanceAmount: pricing.balanceAmount,
          isFullPayment: pricing.isFullPayment,
          scheduledChargeDate: pricing.scheduledChargeDate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create Booking
router.post("/", optionalAuthenticate, validate(createBookingSchema), async (req, res, next) => {
  try {
    const {
      unitId, checkInDate, checkOutDate, guests,
      guestName, guestEmail, guestPhone, specialRequests, couponCode,
    } = req.body;

    const userId = req.user?.userId ?? null;
    const booking = await bookingService.createBooking(
      unitId, userId,
      new Date(checkInDate), new Date(checkOutDate),
      guests, guestName, guestEmail, guestPhone, specialRequests, couponCode,
    );

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
});

// Get My Bookings
router.get("/user", authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = await bookingService.getUserBookings(req.user!.userId, page, pageSize);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Get Booking Details
router.get("/:id", optionalAuthenticate, async (req, res, next) => {
  try {
    let opts: { userId?: string; guestEmail?: string } | undefined;
    if (req.user) {
      opts = { userId: req.user.userId };
    } else if (typeof req.query.email === "string" && req.query.email.trim()) {
      opts = { guestEmail: req.query.email.trim() };
    }
    if (!opts) {
      return res.status(401).json({ success: false, error: "Sign in or provide email" });
    }
    const booking = await bookingService.getBookingById(req.params.id, opts);
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
});

// Cancel Booking
router.post("/:id/cancel", optionalAuthenticate, validate(cancelBookingSchema), async (req, res, next) => {
  try {
    const { reason, guestEmail } = req.body;
    let opts: { userId?: string; guestEmail?: string } | undefined;
    if (req.user) {
      opts = { userId: req.user.userId };
    } else if (guestEmail) {
      opts = { guestEmail };
    }
    if (!opts) {
      return res.status(401).json({ success: false, error: "Sign in or provide guest email" });
    }
    const result = await bookingService.cancelBooking(req.params.id, opts, reason);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export const bookingRouter = router;
