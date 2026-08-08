import ApiError from "../utils/ApiError.js";
import * as dmRepository from "../repositories/dm.repository.js";
import * as friendRepository from "../repositories/friend.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import { emitToUsers } from "../sockets/emitters.js";

/** participantIds come back populated — normalize to plain id strings. */
const participantIds = (dm) =>
  dm.participantIds.map((p) => (p._id ?? p).toString());

export const isParticipant = (dm, userId) =>
  participantIds(dm).includes(userId.toString());

const otherParticipantId = (dm, userId) =>
  participantIds(dm).find((id) => id !== userId.toString());

/** Opens (or returns the existing) 1:1 DM with a friend. */
export const openDm = async (user, targetUserId) => {
  if (targetUserId.toString() === user._id.toString()) {
    throw ApiError.badRequest("You cannot DM yourself");
  }
  const target = await userRepository.findById(targetUserId);
  if (!target || !target.isActive) throw ApiError.notFound("User not found");
  if (await friendRepository.findBlockBetween(user._id, targetUserId)) {
    throw ApiError.forbidden("You cannot DM this user");
  }
  const relationship = await friendRepository.findBetween(user._id, targetUserId);
  if (!relationship || relationship.status !== "accepted") {
    throw ApiError.forbidden("You can only DM your friends");
  }

  const existing = await dmRepository.findByPair(user._id, targetUserId);
  if (existing) return { dm: dmRepository.toDmResponse(existing, user._id), created: false };
  const dm = await dmRepository.createChannel(user._id, targetUserId);
  return { dm: dmRepository.toDmResponse(dm, user._id), created: true };
};

export const listDms = (userId) => dmRepository.listByUser(userId);

/** Loads a DM and enforces that the user is one of its two participants. */
export const getDmForUser = async (dmId, userId) => {
  const dm = await dmRepository.findChannelById(dmId);
  if (!dm) throw ApiError.notFound("DM channel not found");
  if (!isParticipant(dm, userId)) {
    throw ApiError.forbidden("You are not part of this conversation");
  }
  return dm;
};

export const sendMessage = async (dm, author, { content }) => {
  const otherId = otherParticipantId(dm, author._id);
  // Blocks cut off existing conversations too, not just new ones
  if (await friendRepository.findBlockBetween(author._id, otherId)) {
    throw ApiError.forbidden("You cannot send messages in this conversation");
  }
  const message = await dmRepository.createMessage({
    dmId: dm._id,
    authorId: author._id,
    content,
  });
  await dmRepository.touchChannel(dm._id);
  await dmRepository.incrementUnreadCount(dm._id, otherId);
  emitToUsers(participantIds(dm), "dm:new", { message });
  return message;
};

export const markAsRead = async (dm, userId) => {
  const updated = await dmRepository.markReadForUser(dm._id, userId);
  const dmResponse = dmRepository.toDmResponse(updated, userId);
  emitToUsers([userId], "dm:read", {
    dmId: dm._id,
    userId,
    unreadCount: dmResponse.unreadCount,
  });
  return dmResponse;
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

export const toggleReaction = async (dm, user, message, { emoji }) => {
  const reactions = applyReactionToggle(message, user._id, emoji);
  const updated = await dmRepository.updateMessageById(message._id, { reactions });
  emitToUsers(participantIds(dm), "dm:updated", { message: updated });
  return updated;
};

const resolveCursor = async (dm, before) => {
  if (!before) return undefined;
  const anchor = await dmRepository.findMessageById(before);
  if (!anchor || anchor.dmId.toString() !== dm._id.toString()) {
    throw ApiError.badRequest("Invalid cursor");
  }
  return anchor.createdAt;
};

export const listMessages = async (dm, { before, limit }) => {
  const cursor = await resolveCursor(dm, before);
  const messages = await dmRepository.findMessages({ dmId: dm._id, before: cursor, limit });
  const nextCursor = messages.length === limit ? messages[messages.length - 1]._id : null;
  return { messages, nextCursor };
};

const isAuthor = (message, userId) =>
  (message.authorId._id ?? message.authorId).toString() === userId.toString();

export const updateMessage = async (dm, user, message, { content }) => {
  if (!isAuthor(message, user._id)) {
    throw ApiError.forbidden("You can only edit your own messages");
  }
  const updated = await dmRepository.updateMessageById(message._id, {
    content,
    editedAt: new Date(),
  });
  emitToUsers(participantIds(dm), "dm:updated", { message: updated });
  return updated;
};

export const deleteMessage = async (dm, user, message) => {
  if (!isAuthor(message, user._id)) {
    throw ApiError.forbidden("You can only delete your own messages");
  }
  await dmRepository.deleteMessageById(message._id);
  emitToUsers(participantIds(dm), "dm:deleted", {
    messageId: message._id,
    dmId: dm._id,
  });
};
