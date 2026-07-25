import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { requireThreadAccess } from "../middleware/threadAuth.js";
import {
  threadIdParamSchema,
  updateThreadSchema,
} from "../validations/thread.validation.js";
import {
  createMessageSchema,
  listMessagesQuerySchema,
} from "../validations/message.validation.js";
import {
  getThread,
  updateThread,
  archiveThread,
  unarchiveThread,
  lockThread,
  unlockThread,
  joinThread,
  leaveThread,
  deleteThread,
} from "../controllers/thread.controller.js";
import {
  createThreadMessage,
  listThreadMessages,
  listThreadPins,
} from "../controllers/message.controller.js";

const router = Router();

router.use(requireAuth);

// Access (membership + parent channel visibility) for all /threads/:threadId routes
router.use("/:threadId", validate({ params: threadIdParamSchema }), requireThreadAccess);

router.get("/:threadId", getThread);
router.patch("/:threadId", validate({ body: updateThreadSchema }), updateThread);
router.delete("/:threadId", deleteThread);

// Lifecycle (permission rules enforced in the service layer)
router.post("/:threadId/archive", archiveThread);
router.post("/:threadId/unarchive", unarchiveThread);
router.post("/:threadId/lock", lockThread);
router.post("/:threadId/unlock", unlockThread);

// Participation
router.post("/:threadId/join", joinThread);
router.post("/:threadId/leave", leaveThread);

// Messages in this thread (Phase 5; archived/locked rules in the service layer)
router.get(
  "/:threadId/messages",
  validate({ query: listMessagesQuerySchema }),
  listThreadMessages
);
router.post(
  "/:threadId/messages",
  validate({ body: createMessageSchema }),
  createThreadMessage
);
router.get("/:threadId/pins", listThreadPins);

export default router;
