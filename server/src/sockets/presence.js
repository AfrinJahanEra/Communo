import * as presenceState from "./presenceState.js";
import * as userRepository from "../repositories/user.repository.js";
import { friendIdsOf } from "../services/presence.service.js";
import { emitToUsers } from "./emitters.js";
import { safe } from "./ack.js";
import logger from "../utils/logger.js";

/** Fans a presence change out to the user's friends + their own devices. */
const broadcast = async (userId, status, lastSeenAt = null) => {
  const friendIds = await friendIdsOf(userId);
  emitToUsers([...friendIds, userId.toString()], "presence:update", {
    userId,
    status,
    lastSeenAt,
  });
};

/** First socket of a user -> announce online. */
export const handlePresenceConnect = async (socket) => {
  const { becameOnline } = presenceState.addSocket(socket.user._id, socket.id);
  if (becameOnline) await broadcast(socket.user._id, "online");
};

/** Last socket of a user -> persist lastSeenAt and announce offline. */
export const handlePresenceDisconnect = async (socket) => {
  const { wentOffline } = presenceState.removeSocket(socket.user._id, socket.id);
  if (!wentOffline) return;
  const lastSeenAt = new Date();
  await userRepository.updateById(socket.user._id, { lastSeenAt });
  await broadcast(socket.user._id, "offline", lastSeenAt);
};

export const registerPresenceHandlers = (io, socket) => {
  socket.on(
    "presence:set",
    safe(async ({ status }) => {
      if (!presenceState.PRESENCE_STATUSES.includes(status)) {
        throw new Error(`status must be one of: ${presenceState.PRESENCE_STATUSES.join(", ")}`);
      }
      presenceState.setStatus(socket.user._id, status);
      await broadcast(socket.user._id, status);
      return { status };
    })
  );

  socket.on("disconnect", () => {
    handlePresenceDisconnect(socket).catch((err) =>
      logger.error(`presence disconnect failed: ${err.message}`)
    );
  });
};
