import { z } from "zod";
import { objectId } from "./server.validation.js";

export const conversationIdParamSchema = z.object({
  conversationId: objectId("conversation id"),
});

export const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  serverId: objectId("server id").optional(),
});

export const renameConversationSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
});

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message content is required")
    .max(8000, "Message content cannot exceed 8000 characters"),
  resourceIds: z
    .array(objectId("resource id"))
    .max(3, "You can attach at most 3 resources per message")
    .optional()
    .default([]),
});
