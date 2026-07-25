import mongoose from "mongoose";

const threadSchema = new mongoose.Schema(
  {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },
    // Denormalized for cascade deletes and server-wide queries
    serverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Server",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Thread name is required"],
      trim: true,
      minlength: [1, "Thread name is required"],
      maxlength: [100, "Thread name cannot exceed 100 characters"],
    },
    // Placeholder until Phase 5: the message a thread was started from
    parentMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    // Archived threads are read-only until unarchived
    archived: {
      type: Boolean,
      default: false,
    },
    // Locked threads can only be modified by MANAGE_THREADS holders
    locked: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participantIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    // Bumped on activity (messages in Phase 5); drives thread list ordering
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

threadSchema.index({ channelId: 1, archived: 1, lastActiveAt: -1 });
threadSchema.index({ serverId: 1 });

const Thread = mongoose.model("Thread", threadSchema);

export default Thread;
