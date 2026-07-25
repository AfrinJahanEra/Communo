import * as friendRepository from "../repositories/friend.repository.js";
import * as serverMemberRepository from "../repositories/serverMember.repository.js";
import * as presenceState from "../sockets/presenceState.js";

/** Presence snapshot for a populated user doc. */
const snapshot = (user) => {
  const status = presenceState.getStatus(user._id);
  return {
    userId: user._id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    status,
    // lastSeenAt only carries meaning for offline users
    lastSeenAt: status === "offline" ? user.lastSeenAt : null,
  };
};

/** Ids of everyone who should see this user's presence changes (friends). */
export const friendIdsOf = async (userId) => {
  const edges = await friendRepository.listFriendEdges(userId);
  return edges.map((edge) =>
    edge.requesterId.toString() === userId.toString()
      ? edge.recipientId.toString()
      : edge.requesterId.toString()
  );
};

export const friendsPresence = async (userId) => {
  const relationships = await friendRepository.listFriends(userId);
  return relationships.map((rel) => {
    const other =
      rel.requesterId._id.toString() === userId.toString()
        ? rel.recipientId
        : rel.requesterId;
    return snapshot(other);
  });
};

export const serverPresence = async (serverId) => {
  const members = await serverMemberRepository.listUsersByServer(serverId);
  // Guard against members whose user account was hard-removed
  return members.filter((m) => m.userId).map((m) => snapshot(m.userId));
};
