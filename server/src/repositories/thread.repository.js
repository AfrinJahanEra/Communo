import Thread from "../models/Thread.js";

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
