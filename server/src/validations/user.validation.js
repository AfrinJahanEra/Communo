import { z } from "zod";

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().max(50, "Display name cannot exceed 50 characters").optional(),
    bio: z.string().trim().max(200, "Bio cannot exceed 200 characters").optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password cannot exceed 128 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const userIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid user id"),
});
