import api from "../lib/api";

/**
 * AI doubt-solver conversations. Private per user; optionally scoped to a
 * server so its shared resources can be attached as context. The Groq key
 * never reaches the client — every completion goes through the backend.
 */

export const createConversation = async (payload = {}) => {
  const { data } = await api.post("/ai/conversations", payload);
  return data.conversation;
};

export const listConversations = async () => {
  const { data } = await api.get("/ai/conversations");
  return data.conversations;
};

/** { conversation, messages } oldest → newest. */
export const getConversationMessages = async (conversationId) => {
  const { data } = await api.get(`/ai/conversations/${conversationId}/messages`);
  return data;
};

export const renameConversation = async (conversationId, title) => {
  const { data } = await api.patch(`/ai/conversations/${conversationId}`, { title });
  return data.conversation;
};

export const deleteConversation = async (conversationId) => {
  const { data } = await api.delete(`/ai/conversations/${conversationId}`);
  return data;
};

/**
 * One doubt-solver turn. resourceIds (max 3) attach server resources as
 * context. Returns { conversation, userMessage, assistantMessage }.
 */
export const sendMessage = async (conversationId, content, resourceIds = []) => {
  const { data } = await api.post(`/ai/conversations/${conversationId}/messages`, {
    content,
    ...(resourceIds.length ? { resourceIds } : {}),
  });
  return data;
};
