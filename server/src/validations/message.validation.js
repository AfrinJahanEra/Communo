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

/** Metadata returned by POST /attachments after a file is uploaded to Cloudinary. */
export const attachmentSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  resourceType: z.enum(["raw", "image"]).default("raw"),
  mimeType: z.string().min(1),
  originalName: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

// A message needs text or at least one attachment, but not necessarily both
export const createMessageSchema = z
  .object({
    content: z.string().trim().max(2000, "Message cannot exceed 2000 characters").default(""),
    attachments: z.array(attachmentSchema).max(10, "At most 10 attachments per message").default([]),
  })
  .refine((data) => data.content.length > 0 || data.attachments.length > 0, {
    message: "Message must include text or at least one attachment",
    path: ["content"],
  });

export const updateMessageSchema = z.object({
  content: messageContent,
});

export const toggleReactionSchema = z.object({
  emoji: z.string().trim().min(1, "Reaction emoji is required").max(16),
});

export const listMessagesQuerySchema = z.object({
  before: objectId("cursor message id").optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});
