import prisma from "../lib/db";
import {
  AuthError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../lib/errors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "your-refresh-secret";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "30d";
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);

export interface JwtPayload {
  userId: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare password with hash
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(
  payload: JwtPayload,
  expiresIn: string = JWT_EXPIRY,
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY,
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new AuthError("Invalid or expired token");
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
  } catch (error) {
    throw new AuthError("Invalid or expired refresh token");
  }
}

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  firstName: string,
  lastName: string,
  password: string,
) {
  // Validate input
  if (!email || !firstName || !lastName || !password) {
    throw new ValidationError("Missing required fields");
  }

  if (password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters long");
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new ConflictError("User with this email already exists");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      firstName,
      lastName,
      password: hashedPassword,
    },
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

/**
 * Login user
 */
export async function loginUser(email: string, password: string) {
  if (!email || !password) {
    throw new ValidationError("Email and password are required");
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    throw new AuthError("Invalid email or password");
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new AuthError("Invalid email or password");
  }

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store session
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.session.create({
    data: {
      userId: user.id,
      token: accessToken,
      refreshToken,
      expiresAt,
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);

  const session = await prisma.session.findUnique({
    where: { refreshToken },
  });

  if (!session || session.isRevoked) {
    throw new AuthError("Invalid refresh token");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const newPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const newAccessToken = generateToken(newPayload);

  return { accessToken: newAccessToken };
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    // Don't reveal if user exists
    return { success: true };
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token: resetToken,
      expiresAt,
    },
  });

  // TODO: Send email with reset link
  // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  // await sendPasswordResetEmail(user.email, resetLink);

  return { success: true, token: resetToken }; // In production, don't return token
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string) {
  if (!newPassword || newPassword.length < 8) {
    throw new ValidationError("Password must be at least 8 characters long");
  }

  const resetRecord = await prisma.passwordReset.findUnique({
    where: { token },
  });

  if (!resetRecord || resetRecord.isUsed) {
    throw new AuthError("Invalid or expired reset token");
  }

  if (new Date() > resetRecord.expiresAt) {
    throw new AuthError("Reset token has expired");
  }

  const hashedPassword = await hashPassword(newPassword);

  await Promise.all([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { isUsed: true },
    }),
  ]);

  return { success: true };
}

/**
 * Logout user
 */
export async function logoutUser(token: string) {
  await prisma.session.update({
    where: { token },
    data: { isRevoked: true },
  });

  return { success: true };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      address: true,
      city: true,
      zipCode: true,
      country: true,
      isEmailVerified: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    city?: string;
    zipCode?: string;
    country?: string;
  },
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...data,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      address: true,
      city: true,
      zipCode: true,
      country: true,
      isEmailVerified: true,
      createdAt: true,
    },
  });

  return user;
}

/**
 * Change password (requires current password)
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  if (!newPassword || newPassword.length < 8) {
    throw new ValidationError("Password must be at least 8 characters long");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const isPasswordValid = await comparePassword(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new AuthError("Current password is incorrect");
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { success: true };
}
