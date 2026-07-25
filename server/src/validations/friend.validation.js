import { z } from "zod";
import { objectId } from "./server.validation.js";

export const sendRequestSchema = z
  .object({
    userId: objectId("user id").optional(),
    username: z.string().trim().min(3).max(30).optional(),
  })
  .refine((data) => data.userId || data.username, {
    message: "userId or username is required",
  });

export const requestIdParamSchema = z.object({
  requestId: objectId("request id"),
});

export const friendUserParamSchema = z.object({
  userId: objectId("user id"),
});

export const blockUserSchema = z.object({
  userId: objectId("user id"),
});
