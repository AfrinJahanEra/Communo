import asyncHandler from "../utils/asyncHandler.js";
import { sendOk, sendCreated } from "../utils/response.js";
import * as threadService from "../services/thread.service.js";
import * as threadRepository from "../repositories/thread.repository.js";

// Channel-scoped (mounted under /channels/:channelId/threads)

export const createThread = asyncHandler(async (req, res) => {
  const thread = await threadService.createThread(
    req.channel,
    req.user._id,
    req.memberPermissions,
    req.body
  );
  return sendCreated(res, "Thread created", { thread });
});

export const listThreads = asyncHandler(async (req, res) => {
  const threads = await threadService.listThreads(req.channel, req.validatedQuery, req.user._id);
  return sendOk(res, "Threads fetched", { threads });
});

// Thread-scoped (mounted under /threads/:threadId)

export const getThread = asyncHandler(async (req, res) => {
  const thread = threadRepository.toThreadResponse(req.thread, req.user._id);
  return sendOk(res, "Thread fetched", { thread });
});

export const markThreadRead = asyncHandler(async (req, res) => {
  const thread = await threadService.markThreadRead(req.thread, req.user._id);
  return sendOk(res, "Thread marked as read", { thread });
});

export const updateThread = asyncHandler(async (req, res) => {
  const thread = await threadService.updateThread(
    req.thread,
    req.user._id,
    req.memberPermissions,
    req.body
  );
  return sendOk(res, "Thread updated", { thread });
});

export const archiveThread = asyncHandler(async (req, res) => {
  const thread = await threadService.setArchived(
    req.thread,
    req.user._id,
    req.memberPermissions,
    true
  );
  return sendOk(res, "Thread archived", { thread });
});

export const unarchiveThread = asyncHandler(async (req, res) => {
  const thread = await threadService.setArchived(
    req.thread,
    req.user._id,
    req.memberPermissions,
    false
  );
  return sendOk(res, "Thread unarchived", { thread });
});

export const lockThread = asyncHandler(async (req, res) => {
  const thread = await threadService.setLocked(req.thread, req.user._id, req.memberPermissions, true);
  return sendOk(res, "Thread locked", { thread });
});

export const unlockThread = asyncHandler(async (req, res) => {
  const thread = await threadService.setLocked(req.thread, req.user._id, req.memberPermissions, false);
  return sendOk(res, "Thread unlocked", { thread });
});

export const joinThread = asyncHandler(async (req, res) => {
  const thread = await threadService.joinThread(req.thread, req.user._id);
  return sendOk(res, "Joined thread", { thread });
});

export const leaveThread = asyncHandler(async (req, res) => {
  const thread = await threadService.leaveThread(req.thread, req.user._id);
  return sendOk(res, "Left thread", { thread });
});

export const deleteThread = asyncHandler(async (req, res) => {
  await threadService.deleteThread(req.thread, req.user._id, req.memberPermissions);
  return sendOk(res, "Thread deleted");
});
