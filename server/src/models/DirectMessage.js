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
    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      minlength: [1, "Message content is required"],
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// History pagination: newest-first within a conversation
directMessageSchema.index({ dmId: 1, createdAt: -1 });

const DirectMessage = mongoose.model("DirectMessage", directMessageSchema);

export default DirectMessage;
