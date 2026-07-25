import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { PERMISSIONS, hasPermission } from "../constants/permissions.js";
import { resolveMemberPermissions } from "./serverAuth.js";
import * as channelRepository from "../repositories/channel.repository.js";
import * as serverRepository from "../repositories/server.repository.js";
import * as serverMemberRepository from "../repositories/serverMember.repository.js";

/**
 * A member can see a private channel if they hold MANAGE_CHANNELS (or are
 * the owner / an administrator) or have at least one allowed role.
 */
export const canAccessChannel = (channel, membership, bitfield) => {
  if (!hasPermission(bitfield, PERMISSIONS.VIEW_CHANNELS)) return false;
  if (!channel.isPrivate) return true;
  if (hasPermission(bitfield, PERMISSIONS.MANAGE_CHANNELS)) return true;
  const memberRoles = new Set(membership.roleIds.map((id) => id.toString()));
  return channel.allowedRoleIds.some((id) => memberRoles.has(id.toString()));
};

/**
 * Resolves the full access context for a channel: its server, the caller's
 * membership, their permission bitfield — enforcing membership + visibility.
 * Shared by channel routes and thread routes (Phase 4), messaging (Phase 5).
 */
export const loadChannelContext = async (channelId, userId) => {
  const channel = await channelRepository.findById(channelId);
  if (!channel) throw ApiError.notFound("Channel not found");

  const server = await serverRepository.findById(channel.serverId);
  if (!server) throw ApiError.notFound("Server not found");

  const membership = await serverMemberRepository.findMembership(server._id, userId);
  if (!membership) throw ApiError.forbidden("You are not a member of this server");

  const bitfield = await resolveMemberPermissions(server, membership);
  if (!canAccessChannel(channel, membership, bitfield)) {
    throw ApiError.forbidden("You do not have access to this channel");
  }

  return { channel, server, membership, bitfield };
};

/**
 * Loads the channel from :channelId and attaches req.channel, req.server,
 * req.membership and req.memberPermissions.
 */
export const requireChannelAccess = asyncHandler(async (req, _res, next) => {
  const { channel, server, membership, bitfield } = await loadChannelContext(
    req.params.channelId,
    req.user._id
  );
  req.channel = channel;
  req.server = server;
  req.membership = membership;
  req.memberPermissions = bitfield;
  next();
});

/** Permission check against the bitfield resolved by requireChannelAccess. */
export const requireChannelPermission = (permission) => (req, _res, next) => {
  if (!hasPermission(req.memberPermissions, permission)) {
    return next(ApiError.forbidden("You do not have permission to perform this action"));
  }
  next();
};
