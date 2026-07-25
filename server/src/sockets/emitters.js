import { getIO } from "./io.js";

export const channelRoom = (channelId) => `channel:${channelId}`;
export const threadRoom = (threadId) => `thread:${threadId}`;
// Every socket auto-joins its own user room on connect (Phase 7):
// friend/DM events reach a user on all their devices without any join.
export const userRoom = (userId) => `user:${userId}`;

/** Resolves the room a message belongs to (thread room wins). */
export const messageRoom = (message) =>
  message.threadId ? threadRoom(message.threadId) : channelRoom(message.channelId);

/** No-ops when Socket.IO is not initialized (e.g. unit contexts). */
export const emitToRoom = (room, event, payload) => {
  const io = getIO();
  if (io) io.to(room).emit(event, payload);
};

/** Emits to one or more users' personal rooms. */
export const emitToUsers = (userIds, event, payload) => {
  for (const userId of userIds) emitToRoom(userRoom(userId), event, payload);
};
