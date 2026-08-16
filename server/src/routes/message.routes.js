import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { requireMessageAccess } from "../middleware/messageAuth.js";
import {
  messageIdParamSchema,
  updateMessageSchema,
  toggleReactionSchema,
  pollVoteSchema,
  editPollSchema,
} from "../validations/message.validation.js";
import {
  updateMessage,
  deleteMessage,
  pinMessage,
  unpinMessage,
  toggleMessageReaction,
  voteOnPoll,
  editPoll,
} from "../controllers/message.controller.js";

const router = Router();

router.use(requireAuth);

// Access (membership + parent channel visibility) for all /messages/:messageId routes
router.use("/:messageId", validate({ params: messageIdParamSchema }), requireMessageAccess);

router.patch("/:messageId", validate({ body: updateMessageSchema }), updateMessage);
router.delete("/:messageId", deleteMessage);

// Pins (MANAGE_MESSAGES enforced in the service layer)
router.post("/:messageId/pin", pinMessage);
router.delete("/:messageId/pin", unpinMessage);
router.post("/:messageId/reactions", validate({ body: toggleReactionSchema }), toggleMessageReaction);

// Polls: any member can vote; only the author can edit (enforced in the service)
router.post("/:messageId/poll/vote", validate({ body: pollVoteSchema }), voteOnPoll);
router.patch("/:messageId/poll", validate({ body: editPollSchema }), editPoll);

export default router;
