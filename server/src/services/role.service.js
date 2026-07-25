import ApiError from "../utils/ApiError.js";
import { withTransaction } from "../utils/withTransaction.js";
import * as roleRepository from "../repositories/role.repository.js";
import * as serverMemberRepository from "../repositories/serverMember.repository.js";
import * as channelRepository from "../repositories/channel.repository.js";

export const listRoles = (serverId) => roleRepository.findByServer(serverId);

export const createRole = async (serverId, { name, color, permissions, position }) => {
  if (name === "@everyone") {
    throw ApiError.badRequest("Role name '@everyone' is reserved");
  }
  return roleRepository.create({ serverId, name, color, permissions, position });
};

export const updateRole = async (serverId, roleId, update) => {
  const role = await roleRepository.findById(roleId);
  if (!role || role.serverId.toString() !== serverId.toString()) {
    throw ApiError.notFound("Role not found in this server");
  }
  if (role.isDefault && update.name !== undefined) {
    throw ApiError.badRequest("The @everyone role cannot be renamed");
  }
  // isDefault is immutable regardless of input
  const { isDefault: _ignored, ...safeUpdate } = update;
  return roleRepository.updateById(roleId, safeUpdate);
};

export const deleteRole = async (serverId, roleId) => {
  const role = await roleRepository.findById(roleId);
  if (!role || role.serverId.toString() !== serverId.toString()) {
    throw ApiError.notFound("Role not found in this server");
  }
  if (role.isDefault) throw ApiError.badRequest("The @everyone role cannot be deleted");

  await withTransaction(async (session) => {
    await serverMemberRepository.pullRoleFromMembers(serverId, roleId, session);
    await channelRepository.pullRoleFromChannels(serverId, roleId, session);
    await roleRepository.deleteById(roleId, session);
  });
};
