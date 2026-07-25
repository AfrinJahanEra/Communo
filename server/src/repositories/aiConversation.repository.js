import AiConversation from "../models/AiConversation.js";
import AiMessage from "../models/AiMessage.js";

// ---------- conversations ----------

export const createConversation = (data) => AiConversation.create(data);

export const findConversationById = (id) => AiConversation.findById(id);

export const findConversationsByUser = (userId) =>
  AiConversation.find({ userId }).sort({ lastActiveAt: -1 });

export const updateConversationById = (id, update) =>
  AiConversation.findByIdAndUpdate(id, update, {
    returnDocument: "after",
    runValidators: true,
  });

export const deleteConversationById = async (id) => {
  const conversation = await AiConversation.findByIdAndDelete(id);
  if (conversation) await AiMessage.deleteMany({ conversationId: id });
  return conversation;
};

// ---------- messages ----------

export const createMessage = (data) => AiMessage.create(data);

export const findMessages = (conversationId) =>
  AiMessage.find({ conversationId }).sort({ createdAt: 1 });

/** Chronological tail of the conversation for the Groq context window. */
export const findRecentMessages = async (conversationId, limit = 20) => {
  const recent = await AiMessage.find({ conversationId })
    .sort({ createdAt: -1 })
    .limit(limit);
  return recent.reverse();
};
