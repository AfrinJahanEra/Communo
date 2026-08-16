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
    // Channel-only "poll message": present instead of/alongside text content.
    // Any channel member can vote (single choice) or edit the poll — see
    // message.service.js voteOnPoll/editPoll for the (deliberately looser
    // than normal edit-your-own-message) access rules.
    poll: {
      type: new mongoose.Schema(
        {
          question: { type: String, required: true, trim: true, maxlength: 300 },
          options: {
            type: [
              new mongoose.Schema(
                {
                  text: { type: String, required: true, trim: true, maxlength: 80 },
                  voterIds: {
                    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
                    default: [],
                  },
                },
                { _id: true }
              ),
            ],
            validate: {
              validator: (options) => options.length >= 2 && options.length <= 10,
              message: "A poll needs between 2 and 10 options",
            },
          },
        },
        { _id: false }
      ),
      default: null,
    },
  },
  { timestamps: true }
);

messageSchema.pre("validate", function preValidate() {
  if (!this.content?.trim() && this.attachments.length === 0 && !this.poll) {
    this.invalidate("content", "Message must include text, an attachment, or a poll");
  }
});

// History pagination: newest-first within a channel/thread scope
messageSchema.index({ channelId: 1, threadId: 1, createdAt: -1 });
messageSchema.index({ channelId: 1, pinned: 1 });
messageSchema.index({ serverId: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
