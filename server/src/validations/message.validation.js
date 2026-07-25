import { z } from "zod";
import { objectId } from "./server.validation.js";

const messageContent = z
  .string()
  .trim()
  .min(1, "Message content is required")
  .max(2000, "Message cannot exceed 2000 characters");

export const messageIdParamSchema = z.object({
  messageId: objectId("message id"),
});

export const createMessageSchema = z.object({
  content: messageContent,
});

export const updateMessageSchema = z.object({
  content: messageContent,
});

export const listMessagesQuerySchema = z.object({
  before: objectId("cursor message id").optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});
