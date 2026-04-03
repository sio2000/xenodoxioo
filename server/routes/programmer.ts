import { Router } from "express";
import bcrypt from "bcryptjs";
import { generateToken } from "../services/auth.service";

const router = Router();

const PROGRAMMER_STAFF_USER_ID = "00000000-0000-4000-8000-000000000001";

/**
 * Programmer panel login — credentials from env (bcrypt hash), min password length enforced.
 * Set PROGRAMMER_LOGIN_EMAIL and PROGRAMMER_LOGIN_PASSWORD_BCRYPT (bcrypt cost ≥10).
 */
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const expectedEmail = (process.env.PROGRAMMER_LOGIN_EMAIL || "").trim().toLowerCase();
    const passwordHash = process.env.PROGRAMMER_LOGIN_PASSWORD_BCRYPT || "";

    if (!expectedEmail || !passwordHash) {
      return res.status(503).json({
        success: false,
        error: "Programmer login is not configured on the server",
      });
    }

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    if (password.length < 12) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 12 characters",
      });
    }

    if (email !== expectedEmail) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const accessToken = generateToken({
      userId: PROGRAMMER_STAFF_USER_ID,
      email: expectedEmail,
      role: "PROGRAMMER",
    });

    res.json({
      success: true,
      accessToken,
      email: expectedEmail,
      role: "PROGRAMMER",
    });
  } catch (e) {
    console.error("Programmer login error:", e);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

export const programmerRouter = router;
