import { z } from "zod";
import { objectId } from "./server.validation.js";

const threadName = z
  .string()
  .trim()
  .min(1, "Thread name is required")
  .max(100, "Thread name cannot exceed 100 characters");

export const threadIdParamSchema = z.object({
  threadId: objectId("thread id"),
});

export const createThreadSchema = z.object({
  name: threadName,
  // Placeholder until Phase 5 messages exist
  parentMessageId: objectId("parent message id").nullable().optional().default(null),
});

export const updateThreadSchema = z
  .object({
    name: threadName.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const listThreadsQuerySchema = z.object({
  archived: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((v) => v === "true"),
});
