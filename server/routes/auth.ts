
import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import * as authService from "../services/auth.service";

const router = Router();

// Schemas
const registerSchema = z.object({
    email: z.string().email(),
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    password: z.string().min(8),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const refreshTokenSchema = z.object({
    refreshToken: z.string(),
});

const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

const resetPasswordSchema = z.object({
    token: z.string(),
    newPassword: z.string().min(8),
});

const updateProfileSchema = z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
});

const changePasswordSchema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8),
});

// Routes

// Register
router.post("/register", validate(registerSchema), async (req, res, next) => {
    try {
        const { email, firstName, lastName, password } = req.body;
        const user = await authService.registerUser(
            email,
            firstName,
            lastName,
            password,
        );
        res.status(201).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
});

// Login
router.post("/login", validate(loginSchema), async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await authService.loginUser(email, password);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

// Refresh Token
router.post(
    "/refresh",
    validate(refreshTokenSchema),
    async (req, res, next) => {
        try {
            const { refreshToken } = req.body;
            const result = await authService.refreshAccessToken(refreshToken);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },
);

// Get Current User
router.get("/me", authenticate, async (req, res, next) => {
    try {
        const user = await authService.getUserById(req.user!.userId);
        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
});

// Logout
router.post("/logout", authenticate, async (req, res, next) => {
    try {
        // In a real app we might want to invalidate the specific token used
        // But currently we only have refresh token revocation in service
        // So we expect the client to discard the token
        res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        next(error);
    }
});

// Forgot Password
router.post(
    "/forgot-password",
    validate(forgotPasswordSchema),
    async (req, res, next) => {
        try {
            const { email } = req.body;
            const result = await authService.requestPasswordReset(email);
            // In development, we might want to return the token for testing
            // but in production we shouldn't.
            // For now, I'll pass the whole result which includes token if in dev
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },
);

// Reset Password
router.post(
    "/reset-password",
    validate(resetPasswordSchema),
    async (req, res, next) => {
        try {
            const { token, newPassword } = req.body;
            await authService.resetPassword(token, newPassword);
            res.json({ success: true, message: "Password reset successfully" });
        } catch (error) {
            next(error);
        }
    },
);

// Update Profile
router.put("/profile", authenticate, validate(updateProfileSchema), async (req, res, next) => {
    try {
        const user = await authService.updateUserProfile(req.user!.userId, req.body);
        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
});

// Change Password
router.post("/change-password", authenticate, validate(changePasswordSchema), async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        await authService.changePassword(req.user!.userId, currentPassword, newPassword);
        res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
        next(error);
    }
});

export const authRouter = router;
