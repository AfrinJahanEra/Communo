import mongoose from "mongoose";
import { CHANNEL_TYPE_LIST, CHANNEL_TYPES } from "../constants/channels.js";

const channelSchema = new mongoose.Schema(
  {
    serverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Server",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Channel name is required"],
      trim: true,
      lowercase: true,
      minlength: [1, "Channel name is required"],
      maxlength: [50, "Channel name cannot exceed 50 characters"],
      match: [/^[a-z0-9-]+$/, "Channel name may only contain lowercase letters, numbers and dashes"],
    },
    type: {
      type: String,
      enum: CHANNEL_TYPE_LIST,
      default: CHANNEL_TYPES.TEXT,
    },
    topic: {
      type: String,
      default: "",
      trim: true,
      maxlength: [1024, "Topic cannot exceed 1024 characters"],
    },
    position: {
      type: Number,
      default: 0,
    },
    // Private channels are visible only to allowedRoleIds (and managers/owner)
    isPrivate: {
      type: Boolean,
      default: false,
    },
    allowedRoleIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Role" }],
      default: [],
    },
    // Voice only: 0 = unlimited
    userLimit: {
      type: Number,
      default: 0,
      min: 0,
      max: 99,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

channelSchema.index({ serverId: 1, position: 1 });

const Channel = mongoose.model("Channel", channelSchema);

export default Channel;
