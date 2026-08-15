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
    // Optional when attachments are present (see the pre-validate hook below)
    content: {
      type: String,
      default: "",
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    attachments: {
      type: [
        new mongoose.Schema(
          {
            url: { type: String, required: true },
            // Cloudinary bookkeeping for deletion
            publicId: { type: String, required: true },
            resourceType: { type: String, enum: ["raw", "image"], default: "raw" },
            mimeType: { type: String, required: true },
            originalName: { type: String, required: true, maxlength: 255 },
            sizeBytes: { type: Number, required: true },
            width: { type: Number },
            height: { type: Number },
          },
          { _id: false }
        ),
      ],
      default: [],
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

messageSchema.pre("validate", function preValidate() {
  if (!this.content?.trim() && this.attachments.length === 0) {
    this.invalidate("content", "Message must include text or at least one attachment");
  }
});

// History pagination: newest-first within a channel/thread scope
messageSchema.index({ channelId: 1, threadId: 1, createdAt: -1 });
messageSchema.index({ channelId: 1, pinned: 1 });
messageSchema.index({ serverId: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
