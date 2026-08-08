import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    // Denormalized for cascade deletes and permission resolution
    serverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Server",
      required: true,
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },
    // null = plain channel message, set = message inside a thread
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      default: null,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      minlength: [1, "Message content is required"],
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    // Set when the author edits the message
    editedAt: {
      type: Date,
      default: null,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reactions: {
      type: [
        new mongoose.Schema(
          {
            emoji: {
              type: String,
              required: true,
              trim: true,
              maxlength: 16,
            },
            userIds: {
              type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
              default: [],
            },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// History pagination: newest-first within a channel/thread scope
messageSchema.index({ channelId: 1, threadId: 1, createdAt: -1 });
messageSchema.index({ channelId: 1, pinned: 1 });
messageSchema.index({ serverId: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
