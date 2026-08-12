import ApiError from "../utils/ApiError.js";
import { CHANNEL_TYPES } from "../constants/channels.js";
import { PERMISSIONS, hasPermission } from "../constants/permissions.js";
import * as messageRepository from "../repositories/message.repository.js";
import * as channelRepository from "../repositories/channel.repository.js";
import * as threadRepository from "../repositories/thread.repository.js";
import * as serverMemberRepository from "../repositories/serverMember.repository.js";
import { emitToRoom, emitToUsers, messageRoom } from "../sockets/emitters.js";

const isAuthor = (message, userId) =>
  message.authorId._id
    ? message.authorId._id.toString() === userId.toString()
    : message.authorId.toString() === userId.toString();

/** Resolves the `before` message-id cursor into a createdAt date. */
const resolveCursor = async (before) => {
  if (!before) return undefined;
  const anchor = await messageRepository.findById(before);
  if (!anchor) throw ApiError.badRequest("Cursor message not found");
  return anchor.createdAt;
};

const applyReactionToggle = (message, userId, emoji) => {
  const key = userId.toString();
  const normalized = emoji.trim();
  const reactions = (message.reactions || []).map((reaction) => ({
    emoji: reaction.emoji,
    userIds: (reaction.userIds || []).map((id) => id.toString()),
  }));
  const idx = reactions.findIndex((reaction) => reaction.emoji === normalized);

  if (idx === -1) {
    reactions.push({ emoji: normalized, userIds: [key] });
    return reactions;
  }

  const nextIds = reactions[idx].userIds.includes(key)
    ? reactions[idx].userIds.filter((id) => id !== key)
    : [...reactions[idx].userIds, key];

  if (nextIds.length === 0) {
    reactions.splice(idx, 1);
    return reactions;
  }

  reactions[idx].userIds = nextIds;
  return reactions;
};

/** All server members except the author — the shared notification roster. */
const recipientsExcluding = async (serverId, authorId) => {
  const roster = await serverMemberRepository.listUsersByServer(serverId);
  return roster
    .map((member) => member.userId?._id?.toString() || member.userId?.toString())
    .filter(Boolean)
    .filter((id) => id !== authorId.toString());
};

export const createChannelMessage = async (channel, author, bitfield, { content }) => {
  if (channel.type === CHANNEL_TYPES.VOICE) {
    throw ApiError.badRequest("Voice channels do not support text messages");
  }
  if (
    channel.type === CHANNEL_TYPES.ANNOUNCEMENT &&
    !hasPermission(bitfield, PERMISSIONS.MANAGE_MESSAGES)
  ) {
    throw ApiError.forbidden("Only message managers can post in announcement channels");
  }
  const message = await messageRepository.create({
    serverId: channel.serverId,
    channelId: channel._id,
    authorId: author._id,
    content,
  });
  emitToRoom(messageRoom(message), "message:new", { message });
  const recipients = await recipientsExcluding(channel.serverId, author._id);
  if (recipients.length) {
    emitToUsers(recipients, "server:notification", { serverId: channel.serverId, delta: 1 });
    await channelRepository.incrementUnreadForUsers(channel._id, recipients);
    emitToUsers(recipients, "channel:unread", {
      channelId: channel._id,
      serverId: channel.serverId,
      delta: 1,
    });
  }
  return message;
};

export const createThreadMessage = async (thread, author, bitfield, { content }) => {
  if (thread.archived) {
    throw ApiError.badRequest("Cannot post in an archived thread");
  }
  if (thread.locked && !hasPermission(bitfield, PERMISSIONS.MANAGE_THREADS)) {
    throw ApiError.forbidden("This thread is locked");
  }
  const message = await messageRepository.create({
    serverId: thread.serverId,
    channelId: thread.channelId,
    threadId: thread._id,
    authorId: author._id,
    content,
  });
  // Posting makes you a participant and bumps thread activity
  await threadRepository.addParticipant(thread._id, author._id);
  emitToRoom(messageRoom(message), "message:new", { message });
  const recipients = await recipientsExcluding(thread.serverId, author._id);
  if (recipients.length) {
    emitToUsers(recipients, "server:notification", { serverId: thread.serverId, delta: 1 });
    await threadRepository.incrementUnreadForUsers(thread._id, recipients);
    emitToUsers(recipients, "thread:unread", {
      threadId: thread._id,
      channelId: thread.channelId,
      serverId: thread.serverId,
      delta: 1,
    });
  }
  return message;
};

export const listChannelMessages = async (channel, { before, limit }) => {
  const cursor = await resolveCursor(before);
  const messages = await messageRepository.findByScope({
    channelId: channel._id,
    before: cursor,
    limit,
  });
  return {
    messages,
    nextCursor: messages.length === limit ? messages[messages.length - 1]._id : null,
  };
};

export const listThreadMessages = async (thread, { before, limit }) => {
  const cursor = await resolveCursor(before);
  const messages = await messageRepository.findByScope({
    channelId: thread.channelId,
    threadId: thread._id,
    before: cursor,
    limit,
  });
  return {
    messages,
    nextCursor: messages.length === limit ? messages[messages.length - 1]._id : null,
  };
};

/** Only the author may edit; edits are marked with editedAt. */
export const updateMessage = async (message, userId, { content }) => {
  if (!isAuthor(message, userId)) {
    throw ApiError.forbidden("You can only edit your own messages");
  }
  const updated = await messageRepository.updateById(message._id, {
    content,
    editedAt: new Date(),
  });
  emitToRoom(messageRoom(updated), "message:updated", { message: updated });
  return updated;
};

/** Author may delete their own message; MANAGE_MESSAGES may delete any. */
export const deleteMessage = async (message, userId, bitfield) => {
  if (!isAuthor(message, userId) && !hasPermission(bitfield, PERMISSIONS.MANAGE_MESSAGES)) {
    throw ApiError.forbidden("You do not have permission to delete this message");
  }
  await messageRepository.deleteById(message._id);
  emitToRoom(messageRoom(message), "message:deleted", {
    messageId: message._id,
    channelId: message.channelId,
    threadId: message.threadId,
  });
};

export const setPinned = async (message, userId, bitfield, pinned) => {
  if (!hasPermission(bitfield, PERMISSIONS.MANAGE_MESSAGES)) {
    throw ApiError.forbidden("Only message managers can pin or unpin messages");
  }
  if (message.pinned === pinned) {
    throw ApiError.badRequest(pinned ? "Message is already pinned" : "Message is not pinned");
  }
  const updated = await messageRepository.updateById(message._id, {
    pinned,
    pinnedBy: pinned ? userId : null,
  });
  emitToRoom(messageRoom(updated), pinned ? "message:pinned" : "message:unpinned", {
    message: updated,
  });
  return updated;
};

export const listChannelPins = (channel) =>
  messageRepository.findPinnedByScope({ channelId: channel._id });

export const listThreadPins = (thread) =>
  messageRepository.findPinnedByScope({ channelId: thread.channelId, threadId: thread._id });

export const toggleReaction = async (message, userId, { emoji }) => {
  const reactions = applyReactionToggle(message, userId, emoji);
  const updated = await messageRepository.updateById(message._id, { reactions });
  emitToRoom(messageRoom(updated), "message:updated", { message: updated });
  return updated;
};
