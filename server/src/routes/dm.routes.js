import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { requireDmAccess, requireDmMessageAccess } from "../middleware/dmAuth.js";
import {
  openDmSchema,
  dmIdParamSchema,
  dmMessageIdParamSchema,
  createMessageSchema,
  updateMessageSchema,
  listMessagesQuerySchema,
} from "../validations/dm.validation.js";
import {
  openDm,
  listDms,
  sendDmMessage,
  listDmMessages,
  updateDmMessage,
  deleteDmMessage,
} from "../controllers/dm.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/", validate({ body: openDmSchema }), openDm);
router.get("/", listDms);

// Literal /messages segment must be registered before the /:dmId params
router.patch(
  "/messages/:messageId",
  validate({ params: dmMessageIdParamSchema, body: updateMessageSchema }),
  requireDmMessageAccess,
  updateDmMessage
);
router.delete(
  "/messages/:messageId",
  validate({ params: dmMessageIdParamSchema }),
  requireDmMessageAccess,
  deleteDmMessage
);

router.get(
  "/:dmId/messages",
  validate({ params: dmIdParamSchema, query: listMessagesQuerySchema }),
  requireDmAccess,
  listDmMessages
);
router.post(
  "/:dmId/messages",
  validate({ params: dmIdParamSchema, body: createMessageSchema }),
  requireDmAccess,
  sendDmMessage
);

export default router;
