
import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import * as bookingService from "../services/booking.service";

const router = Router();

// Schemas
const checkAvailabilitySchema = z.object({
    unitId: z.string(),
    checkInDate: z.string().datetime(),
    checkOutDate: z.string().datetime(),
});

const getAvailableUnitsSchema = z.object({
    checkInDate: z.string().datetime(),
    checkOutDate: z.string().datetime(),
    guests: z.coerce.number().min(1),
    propertyId: z.string().optional(),
});

const createBookingSchema = z.object({
    unitId: z.string(),
    checkInDate: z.string().datetime(),
    checkOutDate: z.string().datetime(),
    guests: z.number().min(1),
    guestName: z.string().min(2),
    guestEmail: z.string().email(),
    guestPhone: z.string().optional(),
    specialRequests: z.string().optional(),
    couponCode: z.string().optional(),
});

const cancelBookingSchema = z.object({
    reason: z.string().optional(),
});

// Routes

// Check Availability (Public)
router.post(
    "/availability",
    validate(checkAvailabilitySchema),
    async (req, res, next) => {
        try {
            const { unitId, checkInDate, checkOutDate } = req.body;
            const result = await bookingService.checkAvailability(
                unitId,
                new Date(checkInDate),
                new Date(checkOutDate),
            );
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },
);

// Get Available Units (Public)
// Using POST to easily send dates, but could be GET with query params
router.post(
    "/search",
    validate(getAvailableUnitsSchema),
    async (req, res, next) => {
        try {
            const { checkInDate, checkOutDate, guests, propertyId } = req.body;
            const units = await bookingService.getAvailableUnits(
                new Date(checkInDate),
                new Date(checkOutDate),
                guests,
                propertyId,
            );
            res.json({ success: true, data: units });
        } catch (error) {
            next(error);
        }
    },
);

// Create Booking (Authenticated)
router.post(
    "/",
    authenticate,
    validate(createBookingSchema),
    async (req, res, next) => {
        try {
            const {
                unitId,
                checkInDate,
                checkOutDate,
                guests,
                guestName,
                guestEmail,
                guestPhone,
                specialRequests,
                couponCode,
            } = req.body;

            const booking = await bookingService.createBooking(
                unitId,
                req.user!.userId,
                new Date(checkInDate),
                new Date(checkOutDate),
                guests,
                guestName,
                guestEmail,
                guestPhone,
                specialRequests,
                couponCode,
            );

            res.status(201).json({ success: true, data: booking });
        } catch (error) {
            next(error);
        }
    },
);

// Get My Bookings (Authenticated)
router.get("/user", authenticate, async (req, res, next) => {
    try {
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20;

        const result = await bookingService.getUserBookings(
            req.user!.userId,
            page,
            pageSize,
        );
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

// Get Booking Details (Authenticated)
router.get("/:id", authenticate, async (req, res, next) => {
    try {
        const booking = await bookingService.getBookingById(
            req.params.id,
            req.user!.userId,
        );
        res.json({ success: true, data: booking });
    } catch (error) {
        next(error);
    }
});

// Cancel Booking (Authenticated)
router.post(
    "/:id/cancel",
    authenticate,
    validate(cancelBookingSchema),
    async (req, res, next) => {
        try {
            const { reason } = req.body;
            const result = await bookingService.cancelBooking(
                req.params.id,
                req.user!.userId,
                reason,
            );
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },
);

export const bookingRouter = router;
