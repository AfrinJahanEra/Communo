import ApiError from "../utils/ApiError.js";
import { withTransaction } from "../utils/withTransaction.js";
import { canAccessChannel } from "../middleware/channelAuth.js";
import { resolveMemberPermissions } from "../middleware/serverAuth.js";
import { CHANNEL_TYPES } from "../constants/channels.js";
import * as channelRepository from "../repositories/channel.repository.js";
import * as roleRepository from "../repositories/role.repository.js";
import * as threadRepository from "../repositories/thread.repository.js";
import * as messageRepository from "../repositories/message.repository.js";

const assertRolesBelongToServer = async (roleIds, serverId) => {
  const uniqueIds = [...new Set(roleIds)];
  const roles = await roleRepository.findByIdsInServer(uniqueIds, serverId);
  if (roles.length !== uniqueIds.length) {
    throw ApiError.badRequest("One or more roles do not belong to this server");
  }
  return uniqueIds;
};

export const createChannel = async (server, createdBy, data) => {
  if (data.userLimit && data.type !== CHANNEL_TYPES.VOICE) {
    throw ApiError.badRequest("userLimit only applies to voice channels");
  }
  if (data.isPrivate && data.allowedRoleIds?.length) {
    data.allowedRoleIds = await assertRolesBelongToServer(data.allowedRoleIds, server._id);
  }
  const position = await channelRepository.countByServer(server._id);
  return channelRepository.create({ ...data, serverId: server._id, createdBy, position });
};

/** Lists only the channels the member is allowed to see. */
export const listChannels = async (server, membership) => {
  const [channels, bitfield] = await Promise.all([
    channelRepository.findByServer(server._id),
    resolveMemberPermissions(server, membership),
  ]);
  return channels.filter((channel) => canAccessChannel(channel, membership, bitfield));
};

export const updateChannel = async (channel, update) => {
  if (update.userLimit && channel.type !== CHANNEL_TYPES.VOICE) {
    throw ApiError.badRequest("userLimit only applies to voice channels");
  }
  if (update.allowedRoleIds?.length) {
    update.allowedRoleIds = await assertRolesBelongToServer(
      update.allowedRoleIds,
      channel.serverId
    );
  }
  return channelRepository.updateById(channel._id, update);
};

export const deleteChannel = async (server, channelId) => {
  const remaining = await channelRepository.countByServer(server._id);
  if (remaining <= 1) {
    throw ApiError.badRequest("A server must keep at least one channel");
  }
  await withTransaction(async (session) => {
    // Sequential on purpose: a transaction session cannot run parallel ops
    await messageRepository.deleteByChannel(channelId, session);
    await threadRepository.deleteByChannel(channelId, session);
    await channelRepository.deleteById(channelId, session);
  });
};

/** Reorders channels: body carries every channel id in the desired order. */
export const reorderChannels = async (server, orderedIds) => {
  const channels = await channelRepository.findByServer(server._id);
  const current = new Set(channels.map((c) => c._id.toString()));
  const incoming = new Set(orderedIds);
  if (current.size !== incoming.size || [...current].some((id) => !incoming.has(id))) {
    throw ApiError.badRequest("orderedIds must contain every channel of this server exactly once");
  }
  await channelRepository.setPositions(server._id, orderedIds);
  return channelRepository.findByServer(server._id);
};
