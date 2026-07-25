import mongoose from "mongoose";
import { DEFAULT_MEMBER_PERMISSIONS } from "../constants/permissions.js";

const roleSchema = new mongoose.Schema(
  {
    serverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Server",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Role name is required"],
      trim: true,
      minlength: [1, "Role name is required"],
      maxlength: [50, "Role name cannot exceed 50 characters"],
    },
    color: {
      type: String,
      default: "#99aab5",
      match: [/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #5865f2"],
    },
    // Permission bitfield (see constants/permissions.js)
    permissions: {
      type: Number,
      default: DEFAULT_MEMBER_PERMISSIONS,
      min: 0,
    },
    // Higher position = higher rank in the hierarchy
    position: {
      type: Number,
      default: 0,
    },
    // The auto-created @everyone role; cannot be deleted or renamed
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

roleSchema.index({ serverId: 1, position: -1 });

const Role = mongoose.model("Role", roleSchema);

export default Role;
