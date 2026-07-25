import Invite from "../models/Invite.js";

export const create = (data) => Invite.create(data);

export const findByCode = (code) => Invite.findOne({ code });

export const listByServer = (serverId) =>
  Invite.find({ serverId })
    .sort({ createdAt: -1 })
    .populate("createdBy", "username displayName avatar");

export const incrementUses = (id, session) =>
  Invite.updateOne({ _id: id }, { $inc: { uses: 1 } }, { session });

export const deleteById = (id) => Invite.findByIdAndDelete(id);

export const deleteByServer = (serverId, session) =>
  Invite.deleteMany({ serverId }, { session });
