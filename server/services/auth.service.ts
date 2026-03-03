import { supabase } from "../lib/db";
import {
  AuthError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../lib/errors";
import jwt, { SignOptions } from "jsonwebtoken";
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
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as any);
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY,
  } as any);
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
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existingUser) {
    throw new ConflictError("User with this email already exists");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const { data: user, error } = await supabase
    .from('users')
    .insert({
      email: email.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      password: hashedPassword,
    })
    .select()
    .single();

  if (error) {
    console.error('Database error during user creation:', error);
    throw new Error(`Failed to create user: ${error.message}`);
  }

  if (!user) {
    throw new Error("Failed to create user: No data returned");
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
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

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

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
  await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt.toISOString(),
    });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
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

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('refresh_token', refreshToken)
    .single();

  if (!session) {
    throw new AuthError("Invalid refresh token");
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', payload.userId)
    .single();

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
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (!user) {
    // Don't reveal if user exists
    return { success: true };
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

  await supabase
    .from('password_resets')
    .insert({
      user_id: user.id,
      token: resetToken,
      expires_at: expiresAt.toISOString(),
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

  const { data: resetRecord } = await supabase
    .from('password_resets')
    .select('*')
    .eq('token', token)
    .single();

  if (!resetRecord) {
    throw new AuthError("Invalid or expired reset token");
  }

  if (new Date() > new Date(resetRecord.expires_at)) {
    throw new AuthError("Reset token has expired");
  }

  const hashedPassword = await hashPassword(newPassword);

  await Promise.all([
    supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', resetRecord.user_id),
    supabase
      .from('password_resets')
      .update({ used: true })
      .eq('id', resetRecord.id),
  ]);

  return { success: true };
}

/**
 * Logout user
 */
export async function logoutUser(token: string) {
  await supabase
    .from('sessions')
    .update({ revoked: true })
    .eq('token', token);

  return { success: true };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select(`
      id,
      email,
      first_name,
      last_name,
      role,
      is_email_verified,
      created_at
    `)
    .eq('id', userId)
    .single();

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    isEmailVerified: user.is_email_verified,
    createdAt: user.created_at,
  };
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
  const updateData: any = {};
  if (data.firstName) updateData.first_name = data.firstName;
  if (data.lastName) updateData.last_name = data.lastName;
  // Add other fields as needed

  const { data: user } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select(`
      id,
      email,
      first_name,
      last_name,
      role,
      is_email_verified,
      created_at
    `)
    .single();

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    isEmailVerified: user.is_email_verified,
    createdAt: user.created_at,
  };
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

  const { data: user } = await supabase
    .from('users')
    .select('password')
    .eq('id', userId)
    .single();

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const isPasswordValid = await comparePassword(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new AuthError("Current password is incorrect");
  }

  const hashedPassword = await hashPassword(newPassword);

  await supabase
    .from('users')
    .update({ password: hashedPassword })
    .eq('id', userId);

  return { success: true };
}
