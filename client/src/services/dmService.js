import api from "../lib/api";

export const openDm = async (userId) => {
  const { data } = await api.post("/dms", { userId });
  return data.dm;
};

export const listDms = async () => {
  const { data } = await api.get("/dms");
  return data.dms;
};

export const listDmMessages = async (dmId, params = {}) => {
  const { data } = await api.get(`/dms/${dmId}/messages`, { params });
  return data; // { messages, nextCursor }
};

export const sendDmMessage = async (dmId, content, attachments = []) => {
  const { data } = await api.post(`/dms/${dmId}/messages`, { content, attachments });
  return data.message;
};

export const updateDmMessage = async (messageId, content) => {
  const { data } = await api.patch(`/dms/messages/${messageId}`, { content });
  return data.message;
};

export const deleteDmMessage = async (messageId) => {
  const { data } = await api.delete(`/dms/messages/${messageId}`);
  return data;
};

export const markDmRead = async (dmId) => {
  const { data } = await api.post(`/dms/${dmId}/read`);
  return data.dm;
};

export const toggleDmMessageReaction = async (messageId, emoji) => {
  const { data } = await api.post(`/dms/messages/${messageId}/reactions`, { emoji });
  return data.message;
};

/** { overview, keyPoints?, decisions?, actionItems?, unresolved?, messageCount } */
export const summarizeDm = async (dmId) => {
  const { data } = await api.post(`/dms/${dmId}/summarize`);
  return data.summary;
};
