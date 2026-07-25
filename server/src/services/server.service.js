import ApiError from "../utils/ApiError.js";
import { withTransaction } from "../utils/withTransaction.js";
import {
  DEFAULT_MEMBER_PERMISSIONS,
  DEFAULT_ROLE_NAME,
} from "../constants/permissions.js";
import * as serverRepository from "../repositories/server.repository.js";
import * as roleRepository from "../repositories/role.repository.js";
import * as serverMemberRepository from "../repositories/serverMember.repository.js";
import * as inviteRepository from "../repositories/invite.repository.js";
import * as channelRepository from "../repositories/channel.repository.js";
import * as threadRepository from "../repositories/thread.repository.js";
import * as messageRepository from "../repositories/message.repository.js";
import { CHANNEL_TYPES } from "../constants/channels.js";

/**
 * Creates a server with its @everyone role, the owner's membership and a
 * default #general channel, atomically.
 */
export const createServer = async (ownerId, { name, description, isPublic, tags }) => {
  const server = await withTransaction(async (session) => {
    const created = await serverRepository.create(
      { name, description, isPublic, tags, ownerId, memberCount: 1 },
      session
    );
    await roleRepository.create(
      {
        serverId: created._id,
        name: DEFAULT_ROLE_NAME,
        permissions: DEFAULT_MEMBER_PERMISSIONS,
        position: 0,
        isDefault: true,
      },
      session
    );
    await serverMemberRepository.create(
      { serverId: created._id, userId: ownerId },
      session
    );
    await channelRepository.create(
      {
        serverId: created._id,
        name: "general",
        type: CHANNEL_TYPES.TEXT,
        createdBy: ownerId,
        position: 0,
      },
      session
    );
    return created;
  });
  return server;
};

/** Lists every server the user belongs to. */
export const getMyServers = async (userId) => {
  const memberships = await serverMemberRepository.findByUser(userId);
  const servers = await serverRepository.findByIds(memberships.map((m) => m.serverId));
  const byId = new Map(servers.map((s) => [s._id.toString(), s]));
  // Preserve membership order (most recently joined first), drop stale refs
  return memberships
    .map((m) => byId.get(m.serverId.toString()))
    .filter(Boolean);
};

/** Public server discovery with optional search/tag filters. */
export const discoverServers = ({ search, tag, page, limit }) =>
  serverRepository.discover({ search, tag, page, limit });

/** Server details plus its role list (member-only, enforced by middleware). */
export const getServerDetails = async (server) => {
  const roles = await roleRepository.findByServer(server._id);
  return { server, roles };
};

export const updateServer = async (serverId, update) => {
  const server = await serverRepository.updateById(serverId, update);
  if (!server) throw ApiError.notFound("Server not found");
  return server;
};

/** Deletes the server and cascades roles, memberships, invites, channels, threads and messages. */
export const deleteServer = async (serverId) =>
  withTransaction(async (session) => {
    // Sequential on purpose: a transaction session cannot run parallel ops
    await roleRepository.deleteByServer(serverId, session);
    await serverMemberRepository.deleteByServer(serverId, session);
    await inviteRepository.deleteByServer(serverId, session);
    await messageRepository.deleteByServer(serverId, session);
    await threadRepository.deleteByServer(serverId, session);
    await channelRepository.deleteByServer(serverId, session);
    await serverRepository.deleteById(serverId, session);
  });

/** Joins a public server directly (private servers require an invite). */
export const joinPublicServer = async (serverId, userId) => {
  const server = await serverRepository.findById(serverId);
  if (!server) throw ApiError.notFound("Server not found");
  if (!server.isPublic) throw ApiError.forbidden("This server is invite-only");

  const existing = await serverMemberRepository.findMembership(serverId, userId);
  if (existing) throw ApiError.conflict("You are already a member of this server");

  await withTransaction(async (session) => {
    await serverMemberRepository.create({ serverId, userId }, session);
    await serverRepository.incrementMemberCount(serverId, 1, session);
  });
  return server;
};

/** The owner must transfer ownership (or delete the server) before leaving. */
export const leaveServer = async (server, userId) => {
  if (server.ownerId.toString() === userId.toString()) {
    throw ApiError.badRequest(
      "The owner cannot leave. Transfer ownership or delete the server instead"
    );
  }
  await withTransaction(async (session) => {
    await serverMemberRepository.deleteMembership(server._id, userId, session);
    await serverRepository.incrementMemberCount(server._id, -1, session);
  });
};

export const transferOwnership = async (server, newOwnerId) => {
  if (server.ownerId.toString() === newOwnerId) {
    throw ApiError.badRequest("You already own this server");
  }
  const membership = await serverMemberRepository.findMembership(server._id, newOwnerId);
  if (!membership) throw ApiError.badRequest("The new owner must be a server member");

  return serverRepository.updateById(server._id, { ownerId: newOwnerId });
};
