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
