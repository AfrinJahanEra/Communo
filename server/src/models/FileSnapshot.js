import mongoose from "mongoose";

/**
 * Point-in-time checkpoint of a workspace file, created on explicit saves.
 * Capped at the most recent snapshots per file (see repository trim) to
 * provide lightweight version history without unbounded growth.
 */
const fileSnapshotSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkspaceFile",
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    version: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    savedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

fileSnapshotSchema.index({ fileId: 1, createdAt: -1 });

const FileSnapshot = mongoose.model("FileSnapshot", fileSnapshotSchema);

export default FileSnapshot;
