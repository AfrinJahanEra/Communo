import mongoose from "mongoose";
import { LANGUAGE_KEYS } from "../constants/languages.js";

/** Hard cap so a single file can never bloat documents or socket payloads. */
export const MAX_FILE_CONTENT = 200 * 1024; // 200KB of source text

/**
 * A file (or folder marker) inside a server's collaborative workspace.
 * `path` encodes the folder structure ("src/utils/math.py"); most folders
 * are still just derived client-side from file paths, but an explicitly
 * created (possibly empty) folder is persisted here too with `type: "folder"`
 * so it survives reloads and can be renamed/deleted like a file.
 * `version` increments on every accepted edit batch and is the backbone of
 * the sync protocol (stale baseVersion -> full resync).
 */
const workspaceFileSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    serverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Server",
      required: true,
    },
    path: {
      type: String,
      required: [true, "File path is required"],
      trim: true,
      maxlength: [200, "File path cannot exceed 200 characters"],
    },
    type: {
      type: String,
      enum: ["file", "folder"],
      default: "file",
    },
    language: {
      type: String,
      enum: LANGUAGE_KEYS,
      default: "plaintext",
    },
    content: {
      type: String,
      default: "",
      maxlength: [MAX_FILE_CONTENT, "File content exceeds the 200KB limit"],
    },
    version: {
      type: Number,
      default: 1,
    },
    sizeBytes: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

workspaceFileSchema.index({ workspaceId: 1, path: 1 }, { unique: true });

const WorkspaceFile = mongoose.model("WorkspaceFile", workspaceFileSchema);

export default WorkspaceFile;
