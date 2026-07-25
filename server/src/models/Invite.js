import mongoose from "mongoose";

const inviteSchema = new mongoose.Schema(
  {
    serverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Server",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 0 = unlimited uses
    maxUses: {
      type: Number,
      default: 0,
      min: 0,
    },
    uses: {
      type: Number,
      default: 0,
    },
    // null = never expires
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-purge expired invites (docs with null expiresAt are never purged)
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Invite = mongoose.model("Invite", inviteSchema);

export default Invite;
