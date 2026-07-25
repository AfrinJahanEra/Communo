/**
 * In-memory presence store. A user is online while at least one of their
 * sockets is connected (multi-device aware). Manual status (idle/dnd) lives
 * only for the duration of the online session — a fresh login starts "online".
 * For horizontal scaling this would move to Redis.
 */

export const PRESENCE_STATUSES = ["online", "idle", "dnd"];

// userId -> { sockets: Set<socketId>, status }
const users = new Map();

export const getStatus = (userId) =>
  users.get(userId.toString())?.status ?? "offline";

export const isOnline = (userId) => users.has(userId.toString());

/** Returns { becameOnline } — true only for the user's first socket. */
export const addSocket = (userId, socketId) => {
  const key = userId.toString();
  let entry = users.get(key);
  if (!entry) {
    entry = { sockets: new Set(), status: "online" };
    users.set(key, entry);
  }
  const becameOnline = entry.sockets.size === 0;
  entry.sockets.add(socketId);
  return { becameOnline };
};

/** Returns { wentOffline } — true only when the last socket disconnects. */
export const removeSocket = (userId, socketId) => {
  const key = userId.toString();
  const entry = users.get(key);
  if (!entry) return { wentOffline: false };
  entry.sockets.delete(socketId);
  if (entry.sockets.size === 0) {
    users.delete(key);
    return { wentOffline: true };
  }
  return { wentOffline: false };
};

/** Manual status switch; only possible while online. */
export const setStatus = (userId, status) => {
  const entry = users.get(userId.toString());
  if (!entry) return null;
  entry.status = status;
  return entry.status;
};
