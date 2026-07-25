import Channel from "../models/Channel.js";

export const create = async (data, session) => {
  const [channel] = await Channel.create([data], { session });
  return channel;
};

export const findById = (id) => Channel.findById(id);

export const findByServer = (serverId) =>
  Channel.find({ serverId }).sort({ position: 1, createdAt: 1 });

export const countByServer = (serverId) => Channel.countDocuments({ serverId });

export const updateById = (id, update) =>
  Channel.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });

export const deleteById = (id, session) => Channel.findByIdAndDelete(id, { session });

export const deleteByServer = (serverId, session) =>
  Channel.deleteMany({ serverId }, { session });

export const pullRoleFromChannels = (serverId, roleId, session) =>
  Channel.updateMany({ serverId }, { $pull: { allowedRoleIds: roleId } }, { session });

/** Bulk position update used by the reorder endpoint. */
export const setPositions = (serverId, orderedIds) =>
  Channel.bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, serverId },
        update: { $set: { position: index } },
      },
    }))
  );
