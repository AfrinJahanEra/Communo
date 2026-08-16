import api from "../lib/api";

export const updateMessage = async (messageId, content) => {
  const { data } = await api.patch(`/messages/${messageId}`, { content });
  return data.message;
};

export const deleteMessage = async (messageId) => {
  const { data } = await api.delete(`/messages/${messageId}`);
  return data;
};

export const pinMessage = async (messageId) => {
  const { data } = await api.post(`/messages/${messageId}/pin`);
  return data.message;
};

export const unpinMessage = async (messageId) => {
  const { data } = await api.delete(`/messages/${messageId}/pin`);
  return data.message;
};

export const toggleMessageReaction = async (messageId, emoji) => {
  const { data } = await api.post(`/messages/${messageId}/reactions`, { emoji });
  return data.message;
};

/** Single-choice: voting again (for a different option) counts as changing your vote. */
export const votePoll = async (messageId, optionId) => {
  const { data } = await api.post(`/messages/${messageId}/poll/vote`, { optionId });
  return data.message;
};

/** Any channel member may edit a poll's question/options. */
export const editPoll = async (messageId, { question, options }) => {
  const { data } = await api.patch(`/messages/${messageId}/poll`, { question, options });
  return data.message;
};
