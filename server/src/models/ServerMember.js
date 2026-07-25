import mongoose from "mongoose";

/** Junction collection: one document per user per server. */
const serverMemberSchema = new mongoose.Schema(
  {
    serverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Server",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    roleIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Role" }],
      default: [],
    },
    nickname: {
      type: String,
      default: "",
      trim: true,
      maxlength: [32, "Nickname cannot exceed 32 characters"],
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// A user can only be a member of a server once
serverMemberSchema.index({ serverId: 1, userId: 1 }, { unique: true });

const ServerMember = mongoose.model("ServerMember", serverMemberSchema);

export default ServerMember;
