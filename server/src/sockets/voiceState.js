/**
 * In-memory presence store for voice rooms. Voice participation is
 * ephemeral (dies with the socket), so it never touches MongoDB.
 * For horizontal scaling this would move to Redis.
 */

// channelId -> Map<userId, participant>
const channels = new Map();
// socketId -> { channelId, userId } for O(1) disconnect cleanup
const socketIndex = new Map();

export const getParticipants = (channelId) => {
  const room = channels.get(channelId.toString());
  return room ? [...room.values()] : [];
};

export const count = (channelId) => channels.get(channelId.toString())?.size ?? 0;

export const getParticipant = (channelId, userId) =>
  channels.get(channelId.toString())?.get(userId.toString()) || null;

/** Where (if anywhere) this socket currently sits in voice. */
export const getBySocket = (socketId) => socketIndex.get(socketId) || null;

export const join = (channelId, user, socketId) => {
  const key = channelId.toString();
  if (!channels.has(key)) channels.set(key, new Map());
  const participant = {
    userId: user._id.toString(),
    username: user.username,
    displayName: user.displayName || "",
    avatar: user.avatar || "",
    socketId,
    muted: false,
    joinedAt: new Date(),
  };
  channels.get(key).set(participant.userId, participant);
  socketIndex.set(socketId, { channelId: key, userId: participant.userId });
  return participant;
};

export const leave = (channelId, userId) => {
  const key = channelId.toString();
  const room = channels.get(key);
  const participant = room?.get(userId.toString()) || null;
  if (participant) {
    room.delete(userId.toString());
    socketIndex.delete(participant.socketId);
    if (room.size === 0) channels.delete(key);
  }
  return participant;
};

/** Disconnect cleanup: returns what was left (with channelId) or null. */
export const leaveBySocket = (socketId) => {
  const entry = socketIndex.get(socketId);
  if (!entry) return null;
  const participant = leave(entry.channelId, entry.userId);
  return participant ? { ...participant, channelId: entry.channelId } : null;
};

export const setMuted = (socketId, muted) => {
  const entry = socketIndex.get(socketId);
  if (!entry) return null;
  const participant = channels.get(entry.channelId)?.get(entry.userId);
  if (!participant) return null;
  participant.muted = muted;
  return { ...participant, channelId: entry.channelId };
};
