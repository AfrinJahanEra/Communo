import crypto from "crypto";
import ApiError from "../utils/ApiError.js";
import { PERMISSIONS, hasPermission } from "../constants/permissions.js";
import { resolveMemberPermissions } from "../middleware/serverAuth.js";
import { withTransaction } from "../utils/withTransaction.js";
import * as inviteRepository from "../repositories/invite.repository.js";
import * as serverRepository from "../repositories/server.repository.js";
import * as serverMemberRepository from "../repositories/serverMember.repository.js";

const generateCode = () => crypto.randomBytes(6).toString("base64url"); // 8 chars

export const createInvite = async (serverId, createdBy, { maxUses = 0, expiresInHours } = {}) => {
  const expiresAt = expiresInHours
    ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
    : null;
  return inviteRepository.create({
    serverId,
    createdBy,
    code: generateCode(),
    maxUses,
    expiresAt,
  });
};

export const listInvites = (serverId) => inviteRepository.listByServer(serverId);

const assertUsable = (invite) => {
  if (!invite) throw ApiError.notFound("Invite not found or expired");
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    throw ApiError.notFound("Invite not found or expired");
  }
  if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
    throw ApiError.notFound("Invite has reached its maximum uses");
  }
};

/** Public preview: lets a user see what they're joining before they join. */
export const previewInvite = async (code, userId) => {
  const invite = await inviteRepository.findByCode(code);
  assertUsable(invite);
  const server = await serverRepository.findById(invite.serverId);
  if (!server) throw ApiError.notFound("Invite not found or expired");

  const membership = userId ? await serverMemberRepository.findMembership(server._id, userId) : null;

  return {
    code: invite.code,
    server: {
      _id: server._id,
      name: server.name,
      description: server.description,
      icon: server.icon,
      memberCount: server.memberCount,
    },
    alreadyMember: Boolean(membership),
  };
};

export const joinByInvite = async (code, userId) => {
  const invite = await inviteRepository.findByCode(code);
  assertUsable(invite);

  const existing = await serverMemberRepository.findMembership(invite.serverId, userId);
  if (existing) throw ApiError.conflict("You are already a member of this server");

  await withTransaction(async (session) => {
    await serverMemberRepository.create({ serverId: invite.serverId, userId }, session);
    await serverRepository.incrementMemberCount(invite.serverId, 1, session);
    await inviteRepository.incrementUses(invite._id, session);
  });

  return serverRepository.findById(invite.serverId);
};

/** Revocable by the invite creator, or anyone with MANAGE_SERVER. */
export const revokeInvite = async (code, user) => {
  const invite = await inviteRepository.findByCode(code);
  if (!invite) throw ApiError.notFound("Invite not found");

  const isCreator = invite.createdBy.toString() === user._id.toString();
  if (!isCreator) {
    const server = await serverRepository.findById(invite.serverId);
    if (!server) throw ApiError.notFound("Server not found");
    const membership = await serverMemberRepository.findMembership(server._id, user._id);
    if (!membership) throw ApiError.forbidden("You are not a member of this server");
    const bitfield = await resolveMemberPermissions(server, membership);
    if (!hasPermission(bitfield, PERMISSIONS.MANAGE_SERVER)) {
      throw ApiError.forbidden("You do not have permission to revoke this invite");
    }
  }
  await inviteRepository.deleteById(invite._id);
};
