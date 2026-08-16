import asyncHandler from "../utils/asyncHandler.js";
import { sendOk, sendCreated } from "../utils/response.js";
import * as messageService from "../services/message.service.js";

// Channel-scoped (/channels/:channelId/messages, /channels/:channelId/pins)

export const createChannelMessage = asyncHandler(async (req, res) => {
  const message = await messageService.createChannelMessage(
    req.channel,
    req.user,
    req.memberPermissions,
    req.body
  );
  return sendCreated(res, "Message sent", { message });
});

export const listChannelMessages = asyncHandler(async (req, res) => {
  const result = await messageService.listChannelMessages(req.channel, req.validatedQuery);
  return sendOk(res, "Messages fetched", result);
});

export const listChannelPins = asyncHandler(async (req, res) => {
  const messages = await messageService.listChannelPins(req.channel);
  return sendOk(res, "Pinned messages fetched", { messages });
});

// Thread-scoped (/threads/:threadId/messages, /threads/:threadId/pins)

export const createThreadMessage = asyncHandler(async (req, res) => {
  const message = await messageService.createThreadMessage(
    req.thread,
    req.user,
    req.memberPermissions,
    req.body
  );
  return sendCreated(res, "Message sent", { message });
});

export const listThreadMessages = asyncHandler(async (req, res) => {
  const result = await messageService.listThreadMessages(req.thread, req.validatedQuery);
  return sendOk(res, "Messages fetched", result);
});

export const listThreadPins = asyncHandler(async (req, res) => {
  const messages = await messageService.listThreadPins(req.thread);
  return sendOk(res, "Pinned messages fetched", { messages });
});

// Message-scoped (/messages/:messageId)

export const updateMessage = asyncHandler(async (req, res) => {
  const message = await messageService.updateMessage(req.message, req.user._id, req.body);
  return sendOk(res, "Message updated", { message });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  await messageService.deleteMessage(req.message, req.user._id, req.memberPermissions);
  return sendOk(res, "Message deleted");
});

export const pinMessage = asyncHandler(async (req, res) => {
  const message = await messageService.setPinned(
    req.message,
    req.user._id,
    req.memberPermissions,
    true
  );
  return sendOk(res, "Message pinned", { message });
});

export const unpinMessage = asyncHandler(async (req, res) => {
  const message = await messageService.setPinned(
    req.message,
    req.user._id,
    req.memberPermissions,
    false
  );
  return sendOk(res, "Message unpinned", { message });
});

export const toggleMessageReaction = asyncHandler(async (req, res) => {
  const message = await messageService.toggleReaction(req.message, req.user._id, req.body);
  return sendOk(res, "Message reaction updated", { message });
});

export const voteOnPoll = asyncHandler(async (req, res) => {
  const message = await messageService.voteOnPoll(req.message, req.user._id, req.body);
  return sendOk(res, "Vote recorded", { message });
});

export const editPoll = asyncHandler(async (req, res) => {
  const message = await messageService.editPoll(req.message, req.body);
  return sendOk(res, "Poll updated", { message });
});
