import Channel from "../models/Channel.js";

/** Flattens the per-user unreadCounts map to a single count for `userId`. */
export const toChannelResponse = (channel, userId) => {
  if (!channel) return channel;
  const obj = channel.toObject({ flattenMaps: true });
  const key = userId?.toString();
  obj.unreadCount = key ? Number(obj.unreadCounts?.[key] || 0) : 0;
  delete obj.unreadCounts;
  return obj;
};

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

/** Bumps the unread count of every listed user by 1 in a single write. */
export const incrementUnreadForUsers = (channelId, userIds) => {
  if (!userIds.length) return Promise.resolve(null);
  const inc = {};
  userIds.forEach((id) => {
    inc[`unreadCounts.${id.toString()}`] = 1;
  });
  return Channel.findByIdAndUpdate(channelId, { $inc: inc });
};

export const markReadForUser = (channelId, userId) =>
  Channel.findByIdAndUpdate(
    channelId,
    { $set: { [`unreadCounts.${userId.toString()}`]: 0 } },
    { returnDocument: "after" }
  );
