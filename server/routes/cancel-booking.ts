import { Router, Request, Response } from "express";
import * as bookingService from "../services/booking.service";
import { ValidationError } from "../lib/errors";

const router = Router();

// GET /api/cancel-booking?token=xxx — Validate token and return booking info for display
router.get("/", async (req: Request, res: Response) => {
  try {
    const token = (req.query.token as string)?.trim();
    if (!token) {
      return res.status(400).json({ success: false, error: "Μη έγκυρος σύνδεσμος" });
    }

    const result = await bookingService.getBookingByCancellationToken(token);
    if (!result) {
      return res.status(400).json({ success: false, error: "Μη έγκυρος σύνδεσμος" });
    }

    if ("error" in result) {
      const msg =
        result.error === "ALREADY_CANCELLED"
          ? "Η κράτηση έχει ήδη ακυρωθεί"
          : "Ο σύνδεσμος έχει λήξει";
      return res.status(400).json({ success: false, error: msg });
    }

    const booking = result.booking;
    const unit = booking.unit as any;
    const property = unit?.property;

    res.json({
      success: true,
      data: {
        id: booking.id,
        bookingNumber: booking.booking_number,
        guestName: booking.guest_name,
        checkInDate: booking.check_in_date,
        checkOutDate: booking.check_out_date,
        nights: booking.nights,
        guests: booking.guests,
        totalPrice: Number(booking.total_price),
        unitName: unit?.name || "N/A",
        propertyName: property?.name || "N/A",
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, error: error.message });
    }
    throw error;
  }
});

// POST /api/cancel-booking — Execute cancellation
router.post("/", async (req: Request, res: Response) => {
  try {
    const { token } = req.body as { token?: string };
    if (!token || typeof token !== "string") {
      return res.status(400).json({ success: false, error: "Μη έγκυρος σύνδεσμος" });
    }

    const result = await bookingService.cancelBookingByToken(token.trim());
    res.json({
      success: true,
      data: result,
      message: "Η κράτησή σας ακυρώθηκε επιτυχώς.",
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, error: error.message });
    }
    throw error;
  }
});

export const cancelBookingRouter = router;
