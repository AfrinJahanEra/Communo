import { z } from "zod";
import { objectId } from "./server.validation.js";
import {
  createMessageSchema,
  updateMessageSchema,
  toggleReactionSchema,
  listMessagesQuerySchema,
} from "./message.validation.js";

export const openDmSchema = z.object({
  userId: objectId("user id"),
});

export const dmIdParamSchema = z.object({
  dmId: objectId("dm id"),
});

export const dmMessageIdParamSchema = z.object({
  messageId: objectId("message id"),
});

// DM messages share the exact content/pagination contract with channel messages
export { createMessageSchema, updateMessageSchema, toggleReactionSchema, listMessagesQuerySchema };
