import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import * as dmRepository from "../repositories/dm.repository.js";
import { getDmForUser } from "../services/dm.service.js";

/** Attaches req.dm after verifying the user is a participant. */
export const requireDmAccess = asyncHandler(async (req, res, next) => {
  req.dm = await getDmForUser(req.params.dmId, req.user._id);
  next();
});

/** Resolves a DM message + its conversation; attaches req.dm and req.dmMessage. */
export const requireDmMessageAccess = asyncHandler(async (req, res, next) => {
  const message = await dmRepository.findMessageById(req.params.messageId);
  if (!message) throw ApiError.notFound("Message not found");
  req.dm = await getDmForUser(message.dmId, req.user._id);
  req.dmMessage = message;
  next();
});
