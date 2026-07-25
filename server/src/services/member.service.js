import ApiError from "../utils/ApiError.js";
import { PERMISSIONS, hasPermission } from "../constants/permissions.js";
import { resolveMemberPermissions } from "../middleware/serverAuth.js";
import { withTransaction } from "../utils/withTransaction.js";
import * as serverMemberRepository from "../repositories/serverMember.repository.js";
import * as serverRepository from "../repositories/server.repository.js";
import * as roleRepository from "../repositories/role.repository.js";

export const listMembers = (serverId, pagination) =>
  serverMemberRepository.listByServer(serverId, pagination);

/**
 * Updates a member's nickname. Members may change their own nickname;
 * changing someone else's requires MANAGE_SERVER.
 */
export const updateNickname = async (req, targetUserId, nickname) => {
  const isSelf = req.user._id.toString() === targetUserId;
  if (!isSelf) {
    const bitfield = await resolveMemberPermissions(req.server, req.membership);
    if (!hasPermission(bitfield, PERMISSIONS.MANAGE_SERVER)) {
      throw ApiError.forbidden("You can only change your own nickname");
    }
  }
  const member = await serverMemberRepository.updateMembership(
    req.server._id,
    targetUserId,
    { nickname }
  );
  if (!member) throw ApiError.notFound("Member not found in this server");
  return member;
};

/** Replaces a member's role list (MANAGE_ROLES, enforced by route). */
export const setMemberRoles = async (server, targetUserId, roleIds) => {
  const membership = await serverMemberRepository.findMembership(server._id, targetUserId);
  if (!membership) throw ApiError.notFound("Member not found in this server");

  const uniqueIds = [...new Set(roleIds)];
  const roles = await roleRepository.findByIdsInServer(uniqueIds, server._id);
  if (roles.length !== uniqueIds.length) {
    throw ApiError.badRequest("One or more roles do not belong to this server");
  }
  if (roles.some((r) => r.isDefault)) {
    throw ApiError.badRequest("The @everyone role is implicit and cannot be assigned");
  }

  return serverMemberRepository.updateMembership(server._id, targetUserId, {
    roleIds: uniqueIds,
  });
};

/** Kicks a member (KICK_MEMBERS, enforced by route). */
export const kickMember = async (server, actorId, targetUserId) => {
  if (targetUserId === actorId.toString()) {
    throw ApiError.badRequest("You cannot kick yourself; use leave instead");
  }
  if (server.ownerId.toString() === targetUserId) {
    throw ApiError.forbidden("The server owner cannot be kicked");
  }
  const membership = await serverMemberRepository.findMembership(server._id, targetUserId);
  if (!membership) throw ApiError.notFound("Member not found in this server");

  await withTransaction(async (session) => {
    await serverMemberRepository.deleteMembership(server._id, targetUserId, session);
    await serverRepository.incrementMemberCount(server._id, -1, session);
  });
};
