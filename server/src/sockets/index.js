import { Server } from "socket.io";
import { z } from "zod";
import env from "../config/env.js";
import logger from "../utils/logger.js";
import { verifyAccessToken } from "../utils/token.util.js";
import * as userRepository from "../repositories/user.repository.js";
import * as threadRepository from "../repositories/thread.repository.js";
import { loadChannelContext } from "../middleware/channelAuth.js";
import * as messageService from "../services/message.service.js";
import * as dmService from "../services/dm.service.js";
import { setIO } from "./io.js";
import { channelRoom, threadRoom, userRoom } from "./emitters.js";
import { objectId } from "../validations/server.validation.js";
import { safe } from "./ack.js";
import { registerVoiceHandlers } from "./voice.js";
import {
  registerPresenceHandlers,
  handlePresenceConnect,
} from "./presence.js";

const idSchema = objectId("id");
const sendSchema = z.object({
  channelId: objectId("channel id").optional(),
  threadId: objectId("thread id").optional(),
  content: z.string().trim().min(1).max(2000),
});
const dmSendSchema = z.object({
  dmId: objectId("dm id"),
  content: z.string().trim().min(1).max(2000),
});

/** Resolves a thread + verifies parent-channel access for the socket user. */
const loadThreadContext = async (threadId, userId) => {
  const thread = await threadRepository.findById(threadId);
  if (!thread) throw new Error("Thread not found");
  const ctx = await loadChannelContext(thread.channelId, userId);
  return { thread, ...ctx };
};

const registerHandlers = (io, socket) => {
  const user = socket.user;

  // ---------- rooms ----------
  socket.on(
    "channel:join",
    safe(async ({ channelId }) => {
      idSchema.parse(channelId);
      await loadChannelContext(channelId, user._id); // throws if no access
      await socket.join(channelRoom(channelId));
      return { channelId };
    })
  );

  socket.on(
    "channel:leave",
    safe(async ({ channelId }) => {
      idSchema.parse(channelId);
      await socket.leave(channelRoom(channelId));
      return { channelId };
    })
  );

  socket.on(
    "thread:join",
    safe(async ({ threadId }) => {
      idSchema.parse(threadId);
      await loadThreadContext(threadId, user._id); // throws if no access
      await socket.join(threadRoom(threadId));
      return { threadId };
    })
  );

  socket.on(
    "thread:leave",
    safe(async ({ threadId }) => {
      idSchema.parse(threadId);
      await socket.leave(threadRoom(threadId));
      return { threadId };
    })
  );

  // ---------- messaging (same service layer as REST) ----------
  socket.on(
    "message:send",
    safe(async (payload) => {
      const { channelId, threadId, content } = sendSchema.parse(payload);
      if (threadId) {
        const { thread, bitfield } = await loadThreadContext(threadId, user._id);
        const message = await messageService.createThreadMessage(thread, user, bitfield, {
          content,
        });
        return { message };
      }
      if (!channelId) throw new Error("channelId or threadId is required");
      const { channel, bitfield } = await loadChannelContext(channelId, user._id);
      const message = await messageService.createChannelMessage(channel, user, bitfield, {
        content,
      });
      return { message };
    })
  );

  // ---------- typing indicators ----------
  const typing = (isTyping) =>
    safe(async ({ channelId, threadId }) => {
      const room = threadId ? threadRoom(idSchema.parse(threadId)) : channelRoom(idSchema.parse(channelId));
      // Only rooms the socket actually joined may receive its typing state
      if (!socket.rooms.has(room)) throw new Error("Join the room before typing");
      socket.to(room).emit("typing", {
        userId: user._id,
        username: user.username,
        channelId: channelId ?? null,
        threadId: threadId ?? null,
        isTyping,
      });
      return {};
    });

  socket.on("typing:start", typing(true));
  socket.on("typing:stop", typing(false));

  // ---------- direct messages (Phase 7) ----------
  socket.on(
    "dm:send",
    safe(async (payload) => {
      const { dmId, content } = dmSendSchema.parse(payload);
      const dm = await dmService.getDmForUser(dmId, user._id);
      const message = await dmService.sendMessage(dm, user, { content });
      return { message };
    })
  );

  socket.on(
    "dm:typing",
    safe(async ({ dmId, isTyping }) => {
      idSchema.parse(dmId);
      const dm = await dmService.getDmForUser(dmId, user._id);
      // Notify the other participant only (on all of their devices)
      dm.participantIds
        .map((p) => (p._id ?? p).toString())
        .filter((id) => id !== user._id.toString())
        .forEach((id) =>
          socket.to(userRoom(id)).emit("dm:typing", {
            dmId,
            userId: user._id,
            username: user.username,
            isTyping: Boolean(isTyping),
          })
        );
      return {};
    })
  );
};

/** Attaches Socket.IO to the HTTP server with JWT handshake auth. */
export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  // Handshake auth: client passes the access token in `auth.token`
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const decoded = verifyAccessToken(token);
      if (decoded.type !== "access") return next(new Error("Invalid token type"));
      const user = await userRepository.findById(decoded.sub);
      if (!user || !user.isActive) return next(new Error("Account not found or deactivated"));
      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    logger.debug(`socket connected: ${socket.user.username} (${socket.id})`);
    // Personal room: friend/DM events reach this user without any explicit join
    socket.join(userRoom(socket.user._id));
    registerHandlers(io, socket);
    registerVoiceHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    // Announce online (first device only) after handlers are in place
    handlePresenceConnect(socket).catch((err) =>
      logger.error(`presence connect failed: ${err.message}`)
    );
    socket.on("disconnect", () => {
      logger.debug(`socket disconnected: ${socket.user.username} (${socket.id})`);
    });
  });

  setIO(io);
  return io;
};
