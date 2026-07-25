import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import {
  createConversationSchema,
  renameConversationSchema,
  conversationIdParamSchema,
  sendMessageSchema,
} from "../validations/ai.validation.js";
import {
  createConversation,
  listConversations,
  getConversationMessages,
  renameConversation,
  deleteConversation,
  sendMessage,
} from "../controllers/ai.controller.js";

/**
 * AI doubt-solver conversations. Private per user (ownership enforced in
 * the service); the Groq key never leaves the backend.
 */
const router = Router();

router.use(requireAuth);

router.post("/conversations", validate({ body: createConversationSchema }), createConversation);
router.get("/conversations", listConversations);
router.get(
  "/conversations/:conversationId/messages",
  validate({ params: conversationIdParamSchema }),
  getConversationMessages
);
router.patch(
  "/conversations/:conversationId",
  validate({ params: conversationIdParamSchema, body: renameConversationSchema }),
  renameConversation
);
router.delete(
  "/conversations/:conversationId",
  validate({ params: conversationIdParamSchema }),
  deleteConversation
);
router.post(
  "/conversations/:conversationId/messages",
  aiLimiter,
  validate({ params: conversationIdParamSchema, body: sendMessageSchema }),
  sendMessage
);

export default router;
