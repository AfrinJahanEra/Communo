/**
 * In-memory presence store for collaborative workspaces. Participation is
 * ephemeral (dies with the socket) so it never touches MongoDB — same
 * pattern as voiceState. For horizontal scaling this would move to Redis.
 */

// Distinct cursor colors handed out round-robin per workspace
const CURSOR_COLORS = [
  "#8f7ab8", // lavender
  "#e07a5f",
  "#3d8f6f",
  "#c86b98",
  "#5b7fc7",
  "#b8860b",
  "#5f9ea0",
  "#a0522d",
];

// workspaceId -> Map<userId, participant>
const workspaces = new Map();
// socketId -> { workspaceId, userId } for O(1) disconnect cleanup
const socketIndex = new Map();

export const getParticipants = (workspaceId) => {
  const room = workspaces.get(workspaceId.toString());
  return room ? [...room.values()] : [];
};

export const getParticipant = (workspaceId, userId) =>
  workspaces.get(workspaceId.toString())?.get(userId.toString()) || null;

/** Where (if anywhere) this socket currently collaborates. */
export const getBySocket = (socketId) => socketIndex.get(socketId) || null;

export const join = (workspaceId, user, socketId) => {
  const key = workspaceId.toString();
  if (!workspaces.has(key)) workspaces.set(key, new Map());
  const room = workspaces.get(key);
  const participant = {
    userId: user._id.toString(),
    username: user.username,
    displayName: user.displayName || "",
    avatar: user.avatar || "",
    color: CURSOR_COLORS[room.size % CURSOR_COLORS.length],
    socketId,
    activeFileId: null,
    joinedAt: new Date(),
  };
  room.set(participant.userId, participant);
  socketIndex.set(socketId, { workspaceId: key, userId: participant.userId });
  return participant;
};

export const leave = (workspaceId, userId) => {
  const key = workspaceId.toString();
  const room = workspaces.get(key);
  const participant = room?.get(userId.toString()) || null;
  if (participant) {
    room.delete(userId.toString());
    socketIndex.delete(participant.socketId);
    if (room.size === 0) workspaces.delete(key);
  }
  return participant;
};

/** Disconnect cleanup: returns what was left (with workspaceId) or null. */
export const leaveBySocket = (socketId) => {
  const entry = socketIndex.get(socketId);
  if (!entry) return null;
  const participant = leave(entry.workspaceId, entry.userId);
  return participant ? { ...participant, workspaceId: entry.workspaceId } : null;
};

/** Tracks which file the participant is looking at (per-file presence). */
export const setActiveFile = (socketId, fileId) => {
  const entry = socketIndex.get(socketId);
  if (!entry) return null;
  const participant = workspaces.get(entry.workspaceId)?.get(entry.userId);
  if (!participant) return null;
  participant.activeFileId = fileId ? fileId.toString() : null;
  return { ...participant, workspaceId: entry.workspaceId };
};

/** Everyone currently viewing a given file. */
export const getFileParticipants = (workspaceId, fileId) =>
  getParticipants(workspaceId).filter(
    (participant) => participant.activeFileId === fileId.toString()
  );

/** True when nobody (except optionally `exceptUserId`) has the file open. */
export const isFileIdle = (workspaceId, fileId, exceptUserId = null) =>
  getFileParticipants(workspaceId, fileId).filter(
    (participant) => participant.userId !== exceptUserId?.toString()
  ).length === 0;
