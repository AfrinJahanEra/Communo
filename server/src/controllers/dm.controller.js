import asyncHandler from "../utils/asyncHandler.js";
import { sendOk, sendCreated } from "../utils/response.js";
import * as dmService from "../services/dm.service.js";

export const openDm = asyncHandler(async (req, res) => {
  const { dm, created } = await dmService.openDm(req.user, req.body.userId);
  if (created) return sendCreated(res, "DM channel created", { dm });
  return sendOk(res, "DM channel fetched", { dm });
});

export const listDms = asyncHandler(async (req, res) => {
  const dms = await dmService.listDms(req.user._id);
  return sendOk(res, "DM channels fetched", { dms });
});

export const sendDmMessage = asyncHandler(async (req, res) => {
  const message = await dmService.sendMessage(req.dm, req.user, req.body);
  return sendCreated(res, "Message sent", { message });
});

export const listDmMessages = asyncHandler(async (req, res) => {
  const { messages, nextCursor } = await dmService.listMessages(req.dm, req.validatedQuery);
  return sendOk(res, "Messages fetched", { messages, nextCursor });
});

export const updateDmMessage = asyncHandler(async (req, res) => {
  const message = await dmService.updateMessage(req.dm, req.user, req.dmMessage, req.body);
  return sendOk(res, "Message updated", { message });
});

export const deleteDmMessage = asyncHandler(async (req, res) => {
  await dmService.deleteMessage(req.dm, req.user, req.dmMessage);
  return sendOk(res, "Message deleted");
});

export const reactDmMessage = asyncHandler(async (req, res) => {
  const message = await dmService.toggleReaction(req.dm, req.user, req.dmMessage, req.body);
  return sendOk(res, "Message reaction updated", { message });
});

export const markDmRead = asyncHandler(async (req, res) => {
  const dm = await dmService.markAsRead(req.dm, req.user._id);
  return sendOk(res, "DM marked as read", { dm });
});
