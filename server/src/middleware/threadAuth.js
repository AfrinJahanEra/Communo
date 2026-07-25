import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { loadChannelContext } from "./channelAuth.js";
import * as threadRepository from "../repositories/thread.repository.js";

/**
 * Loads the thread from :threadId, then enforces the parent channel's
 * access rules (membership + visibility) via loadChannelContext.
 * Attaches req.thread, req.channel, req.server, req.membership and
 * req.memberPermissions.
 */
export const requireThreadAccess = asyncHandler(async (req, _res, next) => {
  const thread = await threadRepository.findById(req.params.threadId);
  if (!thread) throw ApiError.notFound("Thread not found");

  const { channel, server, membership, bitfield } = await loadChannelContext(
    thread.channelId,
    req.user._id
  );

  req.thread = thread;
  req.channel = channel;
  req.server = server;
  req.membership = membership;
  req.memberPermissions = bitfield;
  next();
});
