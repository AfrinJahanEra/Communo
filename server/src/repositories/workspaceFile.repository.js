import WorkspaceFile from "../models/WorkspaceFile.js";
import FileSnapshot from "../models/FileSnapshot.js";

/** Newest snapshots kept per file; older checkpoints are trimmed away. */
const SNAPSHOT_CAP = 20;

// ---------- files ----------

export const create = (data) => WorkspaceFile.create(data);

export const findById = (id) => WorkspaceFile.findById(id);

/** File tree listing: everything except the (potentially large) content. */
export const findByWorkspace = (workspaceId) =>
  WorkspaceFile.find({ workspaceId })
    .select("-content")
    .sort({ path: 1 })
    .populate("updatedBy", "username displayName");

export const countByWorkspace = (workspaceId) =>
  WorkspaceFile.countDocuments({ workspaceId });

export const findByPath = (workspaceId, path) =>
  WorkspaceFile.findOne({ workspaceId, path });

export const updateById = (id, update) =>
  WorkspaceFile.findByIdAndUpdate(id, update, {
    returnDocument: "after",
    runValidators: true,
  });

/** Auto-save flush from the in-memory document store. */
export const updateContent = (id, { content, version, updatedBy }) =>
  WorkspaceFile.findByIdAndUpdate(
    id,
    { content, version, updatedBy, sizeBytes: Buffer.byteLength(content, "utf8") },
    { returnDocument: "after" }
  );

export const deleteById = async (id) => {
  const file = await WorkspaceFile.findByIdAndDelete(id);
  if (file) await FileSnapshot.deleteMany({ fileId: id });
  return file;
};

// ---------- snapshots (version history) ----------

export const createSnapshot = async (data) => {
  const snapshot = await FileSnapshot.create(data);
  // Trim beyond the cap: cheap because of the (fileId, createdAt) index
  const stale = await FileSnapshot.find({ fileId: data.fileId })
    .sort({ createdAt: -1 })
    .skip(SNAPSHOT_CAP)
    .select("_id");
  if (stale.length) {
    await FileSnapshot.deleteMany({ _id: { $in: stale.map((doc) => doc._id) } });
  }
  return snapshot;
};

export const findSnapshots = (fileId) =>
  FileSnapshot.find({ fileId })
    .select("-content")
    .sort({ createdAt: -1 })
    .populate("savedBy", "username displayName avatar");
