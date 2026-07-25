import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { loadChannelContext } from "./channelAuth.js";
import * as messageRepository from "../repositories/message.repository.js";

/**
 * Loads the message from :messageId, then enforces the parent channel's
 * access rules via loadChannelContext. Attaches req.message plus the usual
 * req.channel / req.server / req.membership / req.memberPermissions.
 */
export const requireMessageAccess = asyncHandler(async (req, _res, next) => {
  const message = await messageRepository.findById(req.params.messageId);
  if (!message) throw ApiError.notFound("Message not found");

  const { channel, server, membership, bitfield } = await loadChannelContext(
    message.channelId,
    req.user._id
  );

  req.message = message;
  req.channel = channel;
  req.server = server;
  req.membership = membership;
  req.memberPermissions = bitfield;
  next();
});
