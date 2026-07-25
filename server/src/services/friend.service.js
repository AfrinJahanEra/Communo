import ApiError from "../utils/ApiError.js";
import * as friendRepository from "../repositories/friend.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import { emitToUsers } from "../sockets/emitters.js";

/** Minimal public shape used in friend payloads/events. */
const publicUser = (user) => ({
  _id: user._id,
  username: user.username,
  displayName: user.displayName,
  avatar: user.avatar,
});

const isSameUser = (a, b) => a.toString() === b.toString();

/** Resolves the target user of a request payload ({ userId } or { username }). */
const resolveTarget = async ({ userId, username }) => {
  const target = userId
    ? await userRepository.findById(userId)
    : await userRepository.findByUsername(username);
  if (!target || !target.isActive) throw ApiError.notFound("User not found");
  return target;
};

export const sendRequest = async (user, payload) => {
  const target = await resolveTarget(payload);
  if (isSameUser(target._id, user._id)) {
    throw ApiError.badRequest("You cannot send a friend request to yourself");
  }
  if (await friendRepository.findBlockBetween(user._id, target._id)) {
    throw ApiError.forbidden("You cannot send a friend request to this user");
  }

  const existing = await friendRepository.findBetween(user._id, target._id);
  if (existing) {
    if (existing.status === "accepted") {
      throw ApiError.conflict("You are already friends with this user");
    }
    if (isSameUser(existing.requesterId, user._id)) {
      throw ApiError.conflict("Friend request already sent");
    }
    // They already asked us — requesting back auto-accepts (Discord-style)
    const accepted = await friendRepository.accept(existing._id);
    emitToUsers([target._id], "friend:accepted", { friend: publicUser(user) });
    return { request: accepted, autoAccepted: true };
  }

  const request = await friendRepository.createRequest(user._id, target._id);
  emitToUsers([target._id], "friend:request", {
    requestId: request._id,
    requester: publicUser(user),
  });
  return { request, autoAccepted: false };
};

export const listRequests = async (userId) => {
  const [incoming, outgoing] = await Promise.all([
    friendRepository.listIncoming(userId),
    friendRepository.listOutgoing(userId),
  ]);
  return { incoming, outgoing };
};

export const acceptRequest = async (user, requestId) => {
  const request = await friendRepository.findById(requestId);
  if (!request || request.status !== "pending") {
    throw ApiError.notFound("Friend request not found");
  }
  if (!isSameUser(request.recipientId, user._id)) {
    throw ApiError.forbidden("Only the recipient can accept a friend request");
  }
  const accepted = await friendRepository.accept(request._id);
  emitToUsers([request.requesterId], "friend:accepted", { friend: publicUser(user) });
  return accepted;
};

/** Recipient declines or requester cancels — either way the edge is removed. */
export const removeRequest = async (user, requestId) => {
  const request = await friendRepository.findById(requestId);
  if (!request || request.status !== "pending") {
    throw ApiError.notFound("Friend request not found");
  }
  const involved =
    isSameUser(request.recipientId, user._id) || isSameUser(request.requesterId, user._id);
  if (!involved) throw ApiError.forbidden("This friend request is not yours");
  await friendRepository.deleteById(request._id);
};

export const listFriends = async (userId) => {
  const relationships = await friendRepository.listFriends(userId);
  // Present the *other* side of each edge as the friend
  return relationships.map((rel) => {
    const other = isSameUser(rel.requesterId._id, userId) ? rel.recipientId : rel.requesterId;
    return { user: publicUser(other), since: rel.acceptedAt };
  });
};

export const removeFriend = async (user, friendUserId) => {
  const existing = await friendRepository.findBetween(user._id, friendUserId);
  if (!existing || existing.status !== "accepted") {
    throw ApiError.notFound("You are not friends with this user");
  }
  await friendRepository.deleteById(existing._id);
  emitToUsers([friendUserId], "friend:removed", { userId: user._id });
};

// ---------- blocks ----------

export const blockUser = async (user, targetUserId) => {
  if (isSameUser(targetUserId, user._id)) {
    throw ApiError.badRequest("You cannot block yourself");
  }
  const target = await userRepository.findById(targetUserId);
  if (!target) throw ApiError.notFound("User not found");
  if (await friendRepository.findBlock(user._id, targetUserId)) {
    throw ApiError.conflict("User is already blocked");
  }
  // Blocking severs any friendship or pending request between the two
  await friendRepository.deleteBetween(user._id, targetUserId);
  const block = await friendRepository.createBlock(user._id, targetUserId);
  return block;
};

export const unblockUser = async (user, targetUserId) => {
  const removed = await friendRepository.deleteBlock(user._id, targetUserId);
  if (!removed) throw ApiError.notFound("User is not blocked");
};

export const listBlocks = async (userId) => {
  const blocks = await friendRepository.listBlocks(userId);
  return blocks.map((b) => ({ user: publicUser(b.blockedId), since: b.createdAt }));
};
