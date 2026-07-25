import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import {
  requireChannelAccess,
  requireChannelPermission,
} from "../middleware/channelAuth.js";
import { PERMISSIONS } from "../constants/permissions.js";
import {
  channelIdParamSchema,
  updateChannelSchema,
} from "../validations/channel.validation.js";
import {
  createThreadSchema,
  listThreadsQuerySchema,
} from "../validations/thread.validation.js";
import {
  createMessageSchema,
  listMessagesQuerySchema,
} from "../validations/message.validation.js";
import {
  getChannel,
  updateChannel,
  deleteChannel,
  getVoiceParticipants,
} from "../controllers/channel.controller.js";
import { createThread, listThreads } from "../controllers/thread.controller.js";
import {
  createChannelMessage,
  listChannelMessages,
  listChannelPins,
} from "../controllers/message.controller.js";

const router = Router();

router.use(requireAuth);

// Access (membership + visibility) enforced for all /channels/:channelId routes
router.use("/:channelId", validate({ params: channelIdParamSchema }), requireChannelAccess);

router.get("/:channelId", getChannel);
router.patch(
  "/:channelId",
  requireChannelPermission(PERMISSIONS.MANAGE_CHANNELS),
  validate({ body: updateChannelSchema }),
  updateChannel
);
router.delete(
  "/:channelId",
  requireChannelPermission(PERMISSIONS.MANAGE_CHANNELS),
  deleteChannel
);

// Threads under this channel (Phase 4)
router.get(
  "/:channelId/threads",
  validate({ query: listThreadsQuerySchema }),
  listThreads
);
router.post(
  "/:channelId/threads",
  requireChannelPermission(PERMISSIONS.SEND_MESSAGES),
  validate({ body: createThreadSchema }),
  createThread
);

// Messages under this channel (Phase 5)
router.get(
  "/:channelId/messages",
  validate({ query: listMessagesQuerySchema }),
  listChannelMessages
);
router.post(
  "/:channelId/messages",
  requireChannelPermission(PERMISSIONS.SEND_MESSAGES),
  validate({ body: createMessageSchema }),
  createChannelMessage
);
router.get("/:channelId/pins", listChannelPins);

// Live voice roster (Phase 6)
router.get("/:channelId/voice", getVoiceParticipants);

export default router;
