import Message from "../models/Message.js";

const AUTHOR_FIELDS = "username displayName avatar";

export const create = async (data) => {
  const message = await Message.create(data);
  return message.populate("authorId", AUTHOR_FIELDS);
};

export const findById = (id) => Message.findById(id);

/**
 * Cursor pagination, newest first. `before` is the createdAt of the last
 * message the client already has.
 */
export const findByScope = ({ channelId, threadId = null, before, limit }) => {
  const filter = { channelId, threadId };
  if (before) filter.createdAt = { $lt: before };
  return Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("authorId", AUTHOR_FIELDS);
};

export const findPinnedByScope = ({ channelId, threadId = null }) =>
  Message.find({ channelId, threadId, pinned: true })
    .sort({ createdAt: -1 })
    .populate("authorId", AUTHOR_FIELDS);

export const updateById = (id, update) =>
  Message.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true })
    .populate("authorId", AUTHOR_FIELDS);

export const deleteById = (id) => Message.findByIdAndDelete(id);

export const deleteByThread = (threadId, session) =>
  Message.deleteMany({ threadId }, { session });

export const deleteByChannel = (channelId, session) =>
  Message.deleteMany({ channelId }, { session });

export const deleteByServer = (serverId, session) =>
  Message.deleteMany({ serverId }, { session });
