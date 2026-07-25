import Relationship from "../models/Relationship.js";
import Block from "../models/Block.js";

const USER_FIELDS = "username displayName avatar lastSeenAt";

// ---------- relationships (requests + friendships) ----------

export const findBetween = (userA, userB) =>
  Relationship.findOne({
    $or: [
      { requesterId: userA, recipientId: userB },
      { requesterId: userB, recipientId: userA },
    ],
  });

export const createRequest = (requesterId, recipientId) =>
  Relationship.create({ requesterId, recipientId });

export const findById = (id) => Relationship.findById(id);

export const accept = (id) =>
  Relationship.findByIdAndUpdate(
    id,
    { status: "accepted", acceptedAt: new Date() },
    { returnDocument: "after" }
  );

export const deleteById = (id) => Relationship.findByIdAndDelete(id);

export const deleteBetween = (userA, userB) =>
  Relationship.deleteMany({
    $or: [
      { requesterId: userA, recipientId: userB },
      { requesterId: userB, recipientId: userA },
    ],
  });

export const listIncoming = (userId) =>
  Relationship.find({ recipientId: userId, status: "pending" })
    .sort({ createdAt: -1 })
    .populate("requesterId", USER_FIELDS);

export const listOutgoing = (userId) =>
  Relationship.find({ requesterId: userId, status: "pending" })
    .sort({ createdAt: -1 })
    .populate("recipientId", USER_FIELDS);

export const listFriends = (userId) =>
  Relationship.find({
    status: "accepted",
    $or: [{ requesterId: userId }, { recipientId: userId }],
  })
    .sort({ acceptedAt: -1 })
    .populate("requesterId", USER_FIELDS)
    .populate("recipientId", USER_FIELDS);

/** Lean accepted edges (ids only) — used for presence fan-out. */
export const listFriendEdges = (userId) =>
  Relationship.find({
    status: "accepted",
    $or: [{ requesterId: userId }, { recipientId: userId }],
  }).select("requesterId recipientId");

// ---------- blocks ----------

export const createBlock = (blockerId, blockedId) =>
  Block.create({ blockerId, blockedId });

export const findBlock = (blockerId, blockedId) =>
  Block.findOne({ blockerId, blockedId });

/** Any block in either direction between two users. */
export const findBlockBetween = (userA, userB) =>
  Block.findOne({
    $or: [
      { blockerId: userA, blockedId: userB },
      { blockerId: userB, blockedId: userA },
    ],
  });

export const deleteBlock = (blockerId, blockedId) =>
  Block.findOneAndDelete({ blockerId, blockedId });

export const listBlocks = (blockerId) =>
  Block.find({ blockerId })
    .sort({ createdAt: -1 })
    .populate("blockedId", USER_FIELDS);
