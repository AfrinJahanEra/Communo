import ApiError from "../utils/ApiError.js";
import { withTransaction } from "../utils/withTransaction.js";
import { CHANNEL_TYPES } from "../constants/channels.js";
import { PERMISSIONS, hasPermission } from "../constants/permissions.js";
import * as threadRepository from "../repositories/thread.repository.js";
import * as messageRepository from "../repositories/message.repository.js";

const MAX_ACTIVE_THREADS_PER_CHANNEL = 50;

const isCreator = (thread, userId) =>
  thread.createdBy.toString() === userId.toString();

const canManage = (thread, userId, bitfield) =>
  isCreator(thread, userId) || hasPermission(bitfield, PERMISSIONS.MANAGE_THREADS);

/**
 * Creates a thread under a text/announcement channel. On announcement
 * channels only MANAGE_THREADS holders may start threads. The creator is
 * automatically the first participant.
 */
export const createThread = async (channel, createdBy, bitfield, data) => {
  if (channel.type === CHANNEL_TYPES.VOICE) {
    throw ApiError.badRequest("Threads cannot be created in voice channels");
  }
  if (
    channel.type === CHANNEL_TYPES.ANNOUNCEMENT &&
    !hasPermission(bitfield, PERMISSIONS.MANAGE_THREADS)
  ) {
    throw ApiError.forbidden("Only thread managers can start threads in announcement channels");
  }
  const active = await threadRepository.countActiveByChannel(channel._id);
  if (active >= MAX_ACTIVE_THREADS_PER_CHANNEL) {
    throw ApiError.badRequest(
      `A channel can have at most ${MAX_ACTIVE_THREADS_PER_CHANNEL} active threads`
    );
  }
  return threadRepository.create({
    ...data,
    channelId: channel._id,
    serverId: channel.serverId,
    createdBy,
    participantIds: [createdBy],
  });
};

/** Active threads by default; pass archived=true for the archive list. */
export const listThreads = (channel, { archived = false } = {}) =>
  threadRepository.findByChannel(channel._id, { archived });

/** Rename: creator or MANAGE_THREADS; locked threads need MANAGE_THREADS. */
export const updateThread = async (thread, userId, bitfield, update) => {
  if (!canManage(thread, userId, bitfield)) {
    throw ApiError.forbidden("Only the thread creator or a thread manager can edit this thread");
  }
  if (thread.locked && !hasPermission(bitfield, PERMISSIONS.MANAGE_THREADS)) {
    throw ApiError.forbidden("This thread is locked");
  }
  if (thread.archived) {
    throw ApiError.badRequest("Unarchive the thread before editing it");
  }
  return threadRepository.updateById(thread._id, update);
};

/** Archive/unarchive: creator or MANAGE_THREADS; locked needs MANAGE_THREADS. */
export const setArchived = async (thread, userId, bitfield, archived) => {
  if (!canManage(thread, userId, bitfield)) {
    throw ApiError.forbidden(
      "Only the thread creator or a thread manager can archive this thread"
    );
  }
  if (thread.locked && !hasPermission(bitfield, PERMISSIONS.MANAGE_THREADS)) {
    throw ApiError.forbidden("This thread is locked");
  }
  if (thread.archived === archived) {
    throw ApiError.badRequest(archived ? "Thread is already archived" : "Thread is not archived");
  }
  return threadRepository.updateById(thread._id, { archived });
};

/** Lock/unlock is a moderation action: MANAGE_THREADS only. */
export const setLocked = async (thread, bitfield, locked) => {
  if (!hasPermission(bitfield, PERMISSIONS.MANAGE_THREADS)) {
    throw ApiError.forbidden("Only thread managers can lock or unlock threads");
  }
  if (thread.locked === locked) {
    throw ApiError.badRequest(locked ? "Thread is already locked" : "Thread is not locked");
  }
  return threadRepository.updateById(thread._id, { locked });
};

/** Joining tracks participation; blocked on archived/locked threads. */
export const joinThread = async (thread, userId) => {
  if (thread.archived) throw ApiError.badRequest("Cannot join an archived thread");
  if (thread.locked) throw ApiError.badRequest("Cannot join a locked thread");
  const already = thread.participantIds.some((id) => id.toString() === userId.toString());
  if (already) throw ApiError.conflict("You are already a participant of this thread");
  return threadRepository.addParticipant(thread._id, userId);
};

export const leaveThread = async (thread, userId) => {
  const participant = thread.participantIds.some((id) => id.toString() === userId.toString());
  if (!participant) throw ApiError.badRequest("You are not a participant of this thread");
  return threadRepository.removeParticipant(thread._id, userId);
};

export const deleteThread = async (thread, userId, bitfield) => {
  if (!canManage(thread, userId, bitfield)) {
    throw ApiError.forbidden(
      "Only the thread creator or a thread manager can delete this thread"
    );
  }
  await withTransaction(async (session) => {
    // Sequential on purpose: a transaction session cannot run parallel ops
    await messageRepository.deleteByThread(thread._id, session);
    await threadRepository.deleteById(thread._id, session);
  });
};
