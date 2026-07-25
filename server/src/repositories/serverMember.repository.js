import ServerMember from "../models/ServerMember.js";

export const create = async (data, session) => {
  const [member] = await ServerMember.create([data], { session });
  return member;
};

export const findMembership = (serverId, userId) =>
  ServerMember.findOne({ serverId, userId });

export const findByUser = (userId) =>
  ServerMember.find({ userId }).sort({ joinedAt: -1 });

export const listByServer = (serverId, { page = 1, limit = 50 } = {}) =>
  ServerMember.find({ serverId })
    .sort({ joinedAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("userId", "username displayName avatar lastSeenAt")
    .populate("roleIds", "name color position");

/** Full member roster with just the user fields presence needs. */
export const listUsersByServer = (serverId) =>
  ServerMember.find({ serverId })
    .select("userId")
    .populate("userId", "username displayName avatar lastSeenAt");

export const updateMembership = (serverId, userId, update) =>
  ServerMember.findOneAndUpdate({ serverId, userId }, update, {
    returnDocument: "after",
    runValidators: true,
  });

export const deleteMembership = (serverId, userId, session) =>
  ServerMember.findOneAndDelete({ serverId, userId }, { session });

export const deleteByServer = (serverId, session) =>
  ServerMember.deleteMany({ serverId }, { session });

export const pullRoleFromMembers = (serverId, roleId, session) =>
  ServerMember.updateMany({ serverId }, { $pull: { roleIds: roleId } }, { session });
