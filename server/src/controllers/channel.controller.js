import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { sendOk, sendCreated } from "../utils/response.js";
import * as channelService from "../services/channel.service.js";
import * as channelRepository from "../repositories/channel.repository.js";
import { CHANNEL_TYPES } from "../constants/channels.js";
import * as voiceState from "../sockets/voiceState.js";

export const createChannel = asyncHandler(async (req, res) => {
  const channel = await channelService.createChannel(req.server, req.user._id, req.body);
  return sendCreated(res, "Channel created", { channel });
});

export const listChannels = asyncHandler(async (req, res) => {
  const channels = await channelService.listChannels(req.server, req.membership, req.user._id);
  return sendOk(res, "Channels fetched", { channels });
});

export const reorderChannels = asyncHandler(async (req, res) => {
  const channels = await channelService.reorderChannels(req.server, req.body.orderedIds);
  return sendOk(res, "Channels reordered", { channels });
});

export const getChannel = asyncHandler(async (req, res) => {
  const channel = channelRepository.toChannelResponse(req.channel, req.user._id);
  return sendOk(res, "Channel fetched", { channel });
});

export const markChannelRead = asyncHandler(async (req, res) => {
  const channel = await channelService.markChannelRead(req.channel, req.user._id);
  return sendOk(res, "Channel marked as read", { channel });
});

export const updateChannel = asyncHandler(async (req, res) => {
  const channel = await channelService.updateChannel(req.channel, req.body);
  return sendOk(res, "Channel updated", { channel });
});

export const deleteChannel = asyncHandler(async (req, res) => {
  await channelService.deleteChannel(req.server, req.channel._id);
  return sendOk(res, "Channel deleted");
});

// Live voice roster comes from the in-memory presence store (Phase 6)
export const getVoiceParticipants = asyncHandler(async (req, res) => {
  if (req.channel.type !== CHANNEL_TYPES.VOICE) {
    throw ApiError.badRequest("This is not a voice channel");
  }
  const participants = voiceState
    .getParticipants(req.channel._id)
    .map(({ userId, username, displayName, avatar, muted, joinedAt }) => ({
      userId,
      username,
      displayName,
      avatar,
      muted,
      joinedAt,
    }));
  return sendOk(res, "Voice participants fetched", { participants });
});
