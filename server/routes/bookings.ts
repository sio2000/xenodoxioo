
import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validation";
import { authenticate, optionalAuthenticate } from "../middleware/auth";
import * as bookingService from "../services/booking.service";
import { supabase } from "../lib/db";

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

const quoteSchema = z.object({
    unitId: z.string(),
    checkInDate: z.string().datetime(),
    checkOutDate: z.string().datetime(),
    guests: z.coerce.number().min(1),
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
    guestEmail: z.string().email().optional(),
});

// Routes

// Get occupied date ranges for a unit (Public) – for calendar
router.get("/occupied-dates", async (req, res, next) => {
    try {
        const unitId = req.query.unitId as string;
        if (!unitId) {
            return res.status(400).json({ success: false, error: "unitId required" });
        }
        const ranges = await bookingService.getOccupiedDateRanges(unitId);
        res.json({ success: true, data: ranges });
    } catch (error) {
        next(error);
    }
});

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

// Get booking quote for a unit (Public)
router.post(
    "/quote",
    validate(quoteSchema),
    async (req, res, next) => {
        try {
            const { unitId, checkInDate, checkOutDate, guests } = req.body;

            const checkIn = new Date(checkInDate);
            const checkOut = new Date(checkOutDate);

            if (!(checkIn instanceof Date) || isNaN(checkIn.getTime()) ||
                !(checkOut instanceof Date) || isNaN(checkOut.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid check-in or check-out date",
                });
            }

            if (checkIn >= checkOut) {
                return res.status(400).json({
                    success: false,
                    error: "Check-out date must be after check-in date",
                });
            }

            const { data: unit } = await supabase
                .from('units')
                .select('*')
                .eq('id', unitId)
                .single();

            if (!unit) {
                return res
                    .status(404)
                    .json({ success: false, error: "Unit not found" });
            }

            if (guests > unit.max_guests) {
                return res.status(400).json({
                    success: false,
                    error: `Maximum guests for this unit is ${unit.max_guests}`,
                });
            }

            // Check for overlapping bookings (simple availability)
            const { data: conflicting } = await supabase
                .from('bookings')
                .select('*')
                .eq('unit_id', unitId)
                .in('status', ["CONFIRMED", "DEPOSIT_PAID", "CHECKED_IN"])
                .or(`check_in_date.lt.${checkOut.toISOString()},check_out_date.gt.${checkIn.toISOString()}`);

            if (conflicting && conflicting.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: "Unit is not available for selected dates",
                });
            }

            const nights = Math.ceil(
                (checkOut.getTime() - checkIn.getTime()) /
                    (1000 * 60 * 60 * 24),
            );

            if (nights < 1) {
                return res.status(400).json({
                    success: false,
                    error: "Minimum stay is 1 night",
                });
            }

            const basePrice = unit.base_price;
            const subtotal = basePrice * nights;
            const cleaningFee = unit.cleaning_fee || 0;
            const taxableAmount = subtotal + cleaningFee;
            const taxes =
                Math.round(taxableAmount * 0.15 * 100) / 100;
            const totalPrice = subtotal + cleaningFee + taxes;
            const depositAmount =
                Math.round(totalPrice * 0.25 * 100) / 100;
            const balanceAmount = totalPrice - depositAmount;

            res.json({
                success: true,
                data: {
                    unit: {
                        id: unit.id,
                        name: unit.name,
                        maxGuests: unit.max_guests,
                        basePrice: unit.base_price,
                        cleaningFee: unit.cleaning_fee,
                    },
                    pricing: {
                        nights,
                        subtotal,
                        cleaningFee,
                        taxes,
                        totalPrice,
                        depositAmount,
                        balanceAmount,
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    },
);

// Create Booking (optional auth: guest checkout or attributed to user)
router.post(
    "/",
    optionalAuthenticate,
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

            const userId = req.user?.userId ?? null;

            const booking = await bookingService.createBooking(
                unitId,
                userId,
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

// Get Booking Details (optional auth, or guest by email for guest bookings)
router.get("/:id", optionalAuthenticate, async (req, res, next) => {
    try {
        const id = req.params.id;
        let opts: { userId?: string; guestEmail?: string } = {};
        if (req.user) {
            opts = { userId: req.user.userId };
        } else if (typeof req.query.email === "string" && req.query.email.trim()) {
            opts = { guestEmail: req.query.email.trim() };
        }
        if (!opts.userId && !opts.guestEmail) {
            return res.status(401).json({
                success: false,
                error: "Sign in or provide email to view this booking",
            });
        }
        const booking = await bookingService.getBookingById(id, opts);
        res.json({ success: true, data: booking });
    } catch (error) {
        next(error);
    }
});

// Cancel Booking (owner or guest by email for guest bookings)
router.post(
    "/:id/cancel",
    optionalAuthenticate,
    validate(cancelBookingSchema),
    async (req, res, next) => {
        try {
            const { reason } = req.body;
            let opts: { userId?: string; guestEmail?: string } = {};
            if (req.user) {
                opts = { userId: req.user.userId };
            } else if (typeof req.body.guestEmail === "string" && req.body.guestEmail.trim()) {
                opts = { guestEmail: req.body.guestEmail.trim() };
            }
            if (!opts.userId && !opts.guestEmail) {
                return res.status(401).json({
                    success: false,
                    error: "Sign in or provide guest email to cancel",
                });
            }
            const result = await bookingService.cancelBooking(
                req.params.id,
                opts,
                reason,
            );
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },
);

export const bookingRouter = router;
