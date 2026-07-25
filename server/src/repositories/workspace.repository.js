import Workspace from "../models/Workspace.js";

export const findByServer = (serverId) => Workspace.findOne({ serverId });

export const findById = (id) => Workspace.findById(id);

export const create = (data) => Workspace.create(data);

export const deleteByServer = (serverId, session) =>
  Workspace.findOneAndDelete({ serverId }, { session });
