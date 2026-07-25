import mongoose from "mongoose";

export const AI_ROLES = Object.freeze({
  USER: "user",
  ASSISTANT: "assistant",
});

/** One turn of an AI conversation; history feeds follow-up questions. */
const aiMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AiConversation",
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(AI_ROLES),
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: [16_000, "Message content cannot exceed 16000 characters"],
    },
    // Resources attached to a user turn (summaries, doubt context)
    resourceIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Resource" }],
      default: [],
    },
    // Token usage reported by Groq for assistant turns (observability)
    tokens: {
      prompt: { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

aiMessageSchema.index({ conversationId: 1, createdAt: 1 });

const AiMessage = mongoose.model("AiMessage", aiMessageSchema);

export default AiMessage;
