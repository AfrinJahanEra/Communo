import mongoose from "mongoose";

/**
 * One collaborative coding workspace per server, created lazily the first
 * time a member opens the editor. Kept as its own document (rather than a
 * flag on Server) so multi-workspace support stays a pure additive change.
 */
const workspaceSchema = new mongoose.Schema(
  {
    serverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Server",
      required: true,
      unique: true,
    },
    name: {
      type: String,
      trim: true,
      default: "Workspace",
      maxlength: [100, "Workspace name cannot exceed 100 characters"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Workspace = mongoose.model("Workspace", workspaceSchema);

export default Workspace;
