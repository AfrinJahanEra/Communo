import { z } from "zod";

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username cannot exceed 30 characters")
  .regex(/^[a-z0-9_.]+$/, "Username may only contain letters, numbers, dots and underscores");

const email = z.string().trim().toLowerCase().email("Please provide a valid email");

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password cannot exceed 128 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const registerSchema = z.object({
  username,
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export const verifyEmailSchema = z.object({
  email,
  // Codes are generated with crypto.randomInt(100000, 1000000)
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

export const resendVerificationSchema = z.object({
  email,
});

export const googleAuthSchema = z.object({
  credential: z.string().trim().min(1, "Google credential is required"),
});

export const adminLoginSchema = z.object({
  email,
  secretKey: z.string().min(1, "Secret key is required").max(128),
});