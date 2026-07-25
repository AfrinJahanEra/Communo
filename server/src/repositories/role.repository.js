import Role from "../models/Role.js";

export const create = async (data, session) => {
  const [role] = await Role.create([data], { session });
  return role;
};

export const findById = (id) => Role.findById(id);

export const findByServer = (serverId) => Role.find({ serverId }).sort({ position: -1 });

export const findByIdsInServer = (ids, serverId) =>
  Role.find({ _id: { $in: ids }, serverId });

export const findDefaultRole = (serverId) => Role.findOne({ serverId, isDefault: true });

export const updateById = (id, update) =>
  Role.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });

export const deleteById = (id, session) => Role.findByIdAndDelete(id, { session });

export const deleteByServer = (serverId, session) =>
  Role.deleteMany({ serverId }, { session });
