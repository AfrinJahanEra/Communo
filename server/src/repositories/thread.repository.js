import Thread from "../models/Thread.js";

/** Flattens the per-user unreadCounts map to a single count for `userId`. */
export const toThreadResponse = (thread, userId) => {
  if (!thread) return thread;
  const obj = thread.toObject({ flattenMaps: true });
  const key = userId?.toString();
  obj.unreadCount = key ? Number(obj.unreadCounts?.[key] || 0) : 0;
  delete obj.unreadCounts;
  return obj;
};

export const create = async (data, session) => {
  const [thread] = await Thread.create([data], { session });
  return thread;
};

export const findById = (id) => Thread.findById(id);

/** Active threads first (by recent activity); archived only when requested. */
export const findByChannel = (channelId, { archived = false } = {}) =>
  Thread.find({ channelId, archived }).sort({ lastActiveAt: -1 });

export const countActiveByChannel = (channelId) =>
  Thread.countDocuments({ channelId, archived: false });

export const updateById = (id, update) =>
  Thread.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });

export const deleteById = (id, session) => Thread.findByIdAndDelete(id, { session });

export const deleteByChannel = (channelId, session) =>
  Thread.deleteMany({ channelId }, { session });

export const deleteByServer = (serverId, session) =>
  Thread.deleteMany({ serverId }, { session });

/** $addToSet keeps participantIds free of duplicates. */
export const addParticipant = (id, userId) =>
  Thread.findByIdAndUpdate(
    id,
    { $addToSet: { participantIds: userId }, $set: { lastActiveAt: new Date() } },
    { returnDocument: "after" }
  );

export const removeParticipant = (id, userId) =>
  Thread.findByIdAndUpdate(
    id,
    { $pull: { participantIds: userId } },
    { returnDocument: "after" }
  );

/** Bumps the unread count of every listed user by 1 in a single write. */
export const incrementUnreadForUsers = (threadId, userIds) => {
  if (!userIds.length) return Promise.resolve(null);
  const inc = {};
  userIds.forEach((id) => {
    inc[`unreadCounts.${id.toString()}`] = 1;
  });
  return Thread.findByIdAndUpdate(threadId, { $inc: inc });
};

export const markReadForUser = (threadId, userId) =>
  Thread.findByIdAndUpdate(
    threadId,
    { $set: { [`unreadCounts.${userId.toString()}`]: 0 } },
    { returnDocument: "after" }
  );
