import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import {
  sendRequestSchema,
  searchUsersSchema,
  requestIdParamSchema,
  friendUserParamSchema,
  blockUserSchema,
} from "../validations/friend.validation.js";
import {
  sendRequest,
  listRequests,
  searchUsers,
  acceptRequest,
  removeRequest,
  listFriends,
  removeFriend,
  blockUser,
  unblockUser,
  listBlocks,
} from "../controllers/friend.controller.js";
import { getFriendsPresence } from "../controllers/presence.controller.js";

const router = Router();

router.use(requireAuth);

// ---------- friend requests ----------
router.get("/search", validate({ query: searchUsersSchema }), searchUsers);
router.post("/requests", validate({ body: sendRequestSchema }), sendRequest);
router.get("/requests", listRequests);
router.post(
  "/requests/:requestId/accept",
  validate({ params: requestIdParamSchema }),
  acceptRequest
);
// Recipient declines / requester cancels
router.delete(
  "/requests/:requestId",
  validate({ params: requestIdParamSchema }),
  removeRequest
);

// ---------- blocks ----------
router.post("/blocks", validate({ body: blockUserSchema }), blockUser);
router.get("/blocks", listBlocks);
router.delete(
  "/blocks/:userId",
  validate({ params: friendUserParamSchema }),
  unblockUser
);

// ---------- friends ----------
router.get("/", listFriends);
router.get("/presence", getFriendsPresence);
router.delete("/:userId", validate({ params: friendUserParamSchema }), removeFriend);

export default router;
