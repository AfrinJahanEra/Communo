import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { hasPermission, ALL_PERMISSIONS } from "../constants/permissions.js";
import * as serverRepository from "../repositories/server.repository.js";
import * as serverMemberRepository from "../repositories/serverMember.repository.js";
import * as roleRepository from "../repositories/role.repository.js";

/**
 * Computes a member's effective permission bitfield:
 * @everyone role OR-ed with every role assigned to the member.
 * The server owner implicitly holds all permissions.
 */
export const resolveMemberPermissions = async (server, membership) => {
  if (server.ownerId.toString() === membership.userId.toString()) {
    return ALL_PERMISSIONS;
  }
  const [defaultRole, roles] = await Promise.all([
    roleRepository.findDefaultRole(server._id),
    membership.roleIds.length
      ? roleRepository.findByIdsInServer(membership.roleIds, server._id)
      : [],
  ]);
  let bitfield = defaultRole ? defaultRole.permissions : 0;
  for (const role of roles) bitfield |= role.permissions;
  return bitfield;
};

/**
 * Loads the server from :serverId and verifies the authenticated user is a
 * member. Attaches req.server and req.membership for downstream handlers.
 */
export const requireServerMember = asyncHandler(async (req, _res, next) => {
  const { serverId } = req.params;
  const server = await serverRepository.findById(serverId);
  if (!server) throw ApiError.notFound("Server not found");

  const membership = await serverMemberRepository.findMembership(serverId, req.user._id);
  if (!membership) throw ApiError.forbidden("You are not a member of this server");

  req.server = server;
  req.membership = membership;
  next();
});

/**
 * Requires a specific permission bit. Must run after requireServerMember.
 * ADMINISTRATOR (and the owner) bypass individual checks.
 */
export const requireServerPermission = (permission) =>
  asyncHandler(async (req, _res, next) => {
    const bitfield = await resolveMemberPermissions(req.server, req.membership);
    if (!hasPermission(bitfield, permission)) {
      throw ApiError.forbidden("You do not have permission to perform this action");
    }
    req.memberPermissions = bitfield;
    next();
  });

/** Restricts a route to the server owner (delete, transfer ownership). */
export const requireServerOwner = (req, _res, next) => {
  if (req.server.ownerId.toString() !== req.user._id.toString()) {
    return next(ApiError.forbidden("Only the server owner can perform this action"));
  }
  next();
};
