import mongoose from "mongoose";

/** Message inside a DM channel. No pins/threads — DMs stay lightweight. */
const directMessageSchema = new mongoose.Schema(
  {
    dmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DmChannel",
      required: true,
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
    editedAt: {
      type: Date,
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

directMessageSchema.pre("validate", function preValidate() {
  if (!this.content?.trim() && this.attachments.length === 0) {
    this.invalidate("content", "Message must include text or at least one attachment");
  }
});

// History pagination: newest-first within a conversation
directMessageSchema.index({ dmId: 1, createdAt: -1 });

const DirectMessage = mongoose.model("DirectMessage", directMessageSchema);

export default DirectMessage;
