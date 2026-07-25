import { z } from "zod";
import { CHANNEL_TYPE_LIST } from "../constants/channels.js";
import { objectId } from "./server.validation.js";

// "General Chat" -> "general-chat" (Discord-style slugs)
const channelName = z
  .string()
  .trim()
  .min(1, "Channel name is required")
  .max(50, "Channel name cannot exceed 50 characters")
  .transform((v) => v.toLowerCase().replace(/\s+/g, "-"))
  .refine((v) => /^[a-z0-9-]+$/.test(v), {
    message: "Channel name may only contain letters, numbers, spaces and dashes",
  });

export const channelIdParamSchema = z.object({
  channelId: objectId("channel id"),
});

export const createChannelSchema = z.object({
  name: channelName,
  type: z.enum(CHANNEL_TYPE_LIST).optional().default("text"),
  topic: z.string().trim().max(1024).optional().default(""),
  isPrivate: z.boolean().optional().default(false),
  allowedRoleIds: z.array(objectId("role id")).max(20).optional().default([]),
  userLimit: z.number().int().min(0).max(99).optional(),
});

export const updateChannelSchema = z
  .object({
    name: channelName.optional(),
    topic: z.string().trim().max(1024).optional(),
    isPrivate: z.boolean().optional(),
    allowedRoleIds: z.array(objectId("role id")).max(20).optional(),
    userLimit: z.number().int().min(0).max(99).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const reorderChannelsSchema = z.object({
  orderedIds: z.array(objectId("channel id")).min(1).max(200),
});
