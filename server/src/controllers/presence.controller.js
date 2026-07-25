import asyncHandler from "../utils/asyncHandler.js";
import { sendOk } from "../utils/response.js";
import * as presenceService from "../services/presence.service.js";

/** Presence of all my friends (mounted under /friends/presence). */
export const getFriendsPresence = asyncHandler(async (req, res) => {
  const presences = await presenceService.friendsPresence(req.user._id);
  return sendOk(res, "Friends presence fetched", { presences });
});

/** Presence of every member of a server I belong to. */
export const getServerPresence = asyncHandler(async (req, res) => {
  const presences = await presenceService.serverPresence(req.server._id);
  return sendOk(res, "Server presence fetched", { presences });
});
