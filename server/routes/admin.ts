
import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validation";
import { authenticate, authorize } from "../middleware/auth";
import * as bookingService from "../services/booking.service";
import * as adminService from "../services/admin.service";
import prisma from "../lib/db";

const router = Router();

// Middleware: All routes require ADMIN role
router.use(authenticate, authorize(["ADMIN"]));

// Schemas
const blockDateSchema = z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    reason: z.string().optional(),
});

const updateBookingStatusSchema = z.object({
    status: z.enum([
        "PENDING",
        "DEPOSIT_PAID",
        "CONFIRMED",
        "CHECKED_IN",
        "CHECKED_OUT",
        "CANCELLED",
        "NO_SHOW",
    ]),
});

// Routes

// Dashboard Stats
router.get("/dashboard", async (req, res, next) => {
    try {
        const stats = await adminService.getDashboardStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
});

// List All Bookings
router.get("/bookings", async (req, res, next) => {
    try {
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20;
        const status = req.query.status as string;

        const result = await adminService.getAllBookings(page, pageSize, status);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

// Block Dates for Property
router.post(
    "/properties/:id/block",
    validate(blockDateSchema),
    async (req, res, next) => {
        try {
            const { startDate, endDate, reason } = req.body;
            const blockage = await adminService.createDateBlockage(
                req.params.id,
                new Date(startDate),
                new Date(endDate),
                reason,
                req.user!.userId
            );
            res.json({ success: true, data: blockage });
        } catch (error) {
            next(error);
        }
    },
);

// Update Booking Status
router.put(
    "/bookings/:id/status",
    validate(updateBookingStatusSchema),
    async (req, res, next) => {
        try {
            const { status } = req.body;
            const booking = await bookingService.updateBookingStatus(req.params.id, status);

            // Log admin action
            await prisma.adminLog.create({
                data: {
                    adminId: req.user!.userId,
                    action: "UPDATE_BOOKING_STATUS",
                    entityType: "BOOKING",
                    entityId: req.params.id,
                    description: `Updated status to ${status}`,
                }
            });

            res.json({ success: true, data: booking });
        } catch (error) {
            next(error);
        }
    },
);

export const adminRouter = router;
