import DmChannel, { dmPairKey } from "../models/DmChannel.js";
import DirectMessage from "../models/DirectMessage.js";

const USER_FIELDS = "username displayName avatar";

// ---------- DM channels ----------

export const findByPair = (userA, userB) =>
  DmChannel.findOne({ pairKey: dmPairKey(userA, userB) })
    .populate("participantIds", USER_FIELDS);

export const createChannel = async (userA, userB) => {
  const dm = await DmChannel.create({
    participantIds: [userA, userB],
    pairKey: dmPairKey(userA, userB),
  });
  return dm.populate("participantIds", USER_FIELDS);
};

export const findChannelById = (id) =>
  DmChannel.findById(id).populate("participantIds", USER_FIELDS);

export const listByUser = (userId) =>
  DmChannel.find({ participantIds: userId })
    .sort({ lastMessageAt: -1 })
    .populate("participantIds", USER_FIELDS);

export const touchChannel = (id) =>
  DmChannel.findByIdAndUpdate(id, { lastMessageAt: new Date() });

// ---------- DM messages ----------

export const createMessage = async (data) => {
  const message = await DirectMessage.create(data);
  return message.populate("authorId", USER_FIELDS);
};

export const findMessageById = (id) => DirectMessage.findById(id);

/** Cursor pagination, newest first (same contract as channel messages). */
export const findMessages = ({ dmId, before, limit }) => {
  const filter = { dmId };
  if (before) filter.createdAt = { $lt: before };
  return DirectMessage.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("authorId", USER_FIELDS);
};

export const updateMessageById = (id, update) =>
  DirectMessage.findByIdAndUpdate(id, update, {
    returnDocument: "after",
    runValidators: true,
  }).populate("authorId", USER_FIELDS);

export const deleteMessageById = (id) => DirectMessage.findByIdAndDelete(id);
