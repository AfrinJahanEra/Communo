import { z } from "zod";
import { CHANNEL_TYPES } from "../constants/channels.js";
import { PERMISSIONS, hasPermission } from "../constants/permissions.js";
import { loadChannelContext } from "../middleware/channelAuth.js";
import { objectId } from "../validations/server.validation.js";
import { safe } from "./ack.js";
import * as voiceState from "./voiceState.js";

export const voiceRoom = (channelId) => `voice:${channelId}`;

const idSchema = objectId("id");
const signalSchema = z.object({
  targetUserId: objectId("target user id"),
  // Opaque WebRTC payload (SDP offer/answer or ICE candidate) — relayed as-is
  data: z.unknown(),
});

/** Public projection of a participant (socketId stays server-side). */
const toPublic = ({ userId, username, displayName, avatar, muted, joinedAt }) => ({
  userId,
  username,
  displayName,
  avatar,
  muted,
  joinedAt,
});

export const registerVoiceHandlers = (io, socket) => {
  const user = socket.user;

  /** Removes the socket from its current voice room and notifies the others. */
  const leaveCurrentVoice = async () => {
    const left = voiceState.leaveBySocket(socket.id);
    if (!left) return null;
    await socket.leave(voiceRoom(left.channelId));
    io.to(voiceRoom(left.channelId)).emit("voice:user-left", {
      channelId: left.channelId,
      userId: left.userId,
    });
    return left;
  };

  socket.on(
    "voice:join",
    safe(async ({ channelId }) => {
      idSchema.parse(channelId);
      const { channel, bitfield } = await loadChannelContext(channelId, user._id);

      if (channel.type !== CHANNEL_TYPES.VOICE) {
        throw new Error("This is not a voice channel");
      }
      if (!hasPermission(bitfield, PERMISSIONS.CONNECT_VOICE)) {
        throw new Error("You do not have permission to connect to voice channels");
      }
      const current = voiceState.getBySocket(socket.id);
      if (current?.channelId === channel._id.toString()) {
        throw new Error("You are already in this voice channel");
      }
      if (voiceState.getParticipant(channel._id, user._id)) {
        throw new Error("You are already in this voice channel from another session");
      }
      if (channel.userLimit > 0 && voiceState.count(channel._id) >= channel.userLimit) {
        throw new Error("This voice channel is full");
      }

      await leaveCurrentVoice(); // one voice room per socket: auto-switch

      const participant = voiceState.join(channel._id, user, socket.id);
      await socket.join(voiceRoom(channel._id));
      socket.to(voiceRoom(channel._id)).emit("voice:user-joined", {
        channelId: channel._id,
        participant: toPublic(participant),
      });
      // The joiner gets the current roster to start WebRTC offers with
      return {
        channelId: channel._id,
        participants: voiceState.getParticipants(channel._id).map(toPublic),
      };
    })
  );

  socket.on(
    "voice:leave",
    safe(async () => {
      const left = await leaveCurrentVoice();
      if (!left) throw new Error("You are not in a voice channel");
      return { channelId: left.channelId };
    })
  );

  socket.on(
    "voice:mute",
    safe(async ({ muted }) => {
      if (typeof muted !== "boolean") throw new Error("muted must be a boolean");
      const updated = voiceState.setMuted(socket.id, muted);
      if (!updated) throw new Error("You are not in a voice channel");
      socket.to(voiceRoom(updated.channelId)).emit("voice:state", {
        channelId: updated.channelId,
        userId: updated.userId,
        muted: updated.muted,
      });
      return { muted: updated.muted };
    })
  );

  /** Relays WebRTC offers/answers/ICE candidates between two room peers. */
  socket.on(
    "voice:signal",
    safe(async (payload) => {
      const { targetUserId, data } = signalSchema.parse(payload);
      const entry = voiceState.getBySocket(socket.id);
      if (!entry) throw new Error("Join a voice channel before signaling");
      const target = voiceState.getParticipant(entry.channelId, targetUserId);
      if (!target) throw new Error("Target user is not in your voice channel");
      io.to(target.socketId).emit("voice:signal", {
        channelId: entry.channelId,
        fromUserId: entry.userId,
        fromUsername: user.username,
        data,
      });
      return {};
    })
  );

  // Socket dropped (tab closed, network loss): free the voice slot
  socket.on("disconnect", () => {
    const left = voiceState.leaveBySocket(socket.id);
    if (left) {
      io.to(voiceRoom(left.channelId)).emit("voice:user-left", {
        channelId: left.channelId,
        userId: left.userId,
      });
    }
  });
};
