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

const pollOptionText = z
  .string()
  .trim()
  .min(1, "Option cannot be empty")
  .max(80, "Option cannot exceed 80 characters");

/** Question + 2-10 answer choices. Votes are managed separately (poll/vote). */
export const pollSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(300, "Question cannot exceed 300 characters"),
  options: z
    .array(pollOptionText)
    .min(2, "A poll needs at least 2 options")
    .max(10, "A poll can have at most 10 options"),
});

export const editPollSchema = pollSchema;

export const pollVoteSchema = z.object({
  optionId: objectId("option id"),
});

// A message needs text, an attachment, or a poll — not necessarily all three
export const createMessageSchema = z
  .object({
    content: z.string().trim().max(2000, "Message cannot exceed 2000 characters").default(""),
    attachments: z.array(attachmentSchema).max(10, "At most 10 attachments per message").default([]),
    poll: pollSchema.optional(),
  })
  .refine((data) => data.content.length > 0 || data.attachments.length > 0 || Boolean(data.poll), {
    message: "Message must include text, an attachment, or a poll",
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
