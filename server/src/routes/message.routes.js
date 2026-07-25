import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { requireMessageAccess } from "../middleware/messageAuth.js";
import {
  messageIdParamSchema,
  updateMessageSchema,
} from "../validations/message.validation.js";
import {
  updateMessage,
  deleteMessage,
  pinMessage,
  unpinMessage,
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

export default router;
