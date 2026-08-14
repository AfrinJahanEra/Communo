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
  // 48 random bytes rendered as hex = 96 characters
  token: z
    .string()
    .trim()
    .min(32, "Invalid verification token")
    .max(256, "Invalid verification token")
    .regex(/^[a-f0-9]+$/, "Invalid verification token"),
});

export const resendVerificationSchema = z.object({
  email,
});

export const googleAuthSchema = z.object({
  credential: z.string().trim().min(1, "Google credential is required"),
});