import mongoose from "mongoose";

/**
 * A private AI doubt-solver conversation. Owned by one user; optionally
 * scoped to a server so its shared resources can be attached as context.
 */
const aiConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    serverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Server",
      default: null,
    },
    title: {
      type: String,
      trim: true,
      default: "New conversation",
      maxlength: [120, "Title cannot exceed 120 characters"],
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

aiConversationSchema.index({ userId: 1, lastActiveAt: -1 });

const AiConversation = mongoose.model("AiConversation", aiConversationSchema);

export default AiConversation;
