import api from "../lib/api";

export const getThread = async (threadId) => {
  const { data } = await api.get(`/threads/${threadId}`);
  return data.thread;
};

export const updateThread = async (threadId, payload) => {
  const { data } = await api.patch(`/threads/${threadId}`, payload);
  return data.thread;
};

export const deleteThread = async (threadId) => {
  const { data } = await api.delete(`/threads/${threadId}`);
  return data;
};

export const archiveThread = async (threadId) => {
  const { data } = await api.post(`/threads/${threadId}/archive`);
  return data.thread;
};

export const unarchiveThread = async (threadId) => {
  const { data } = await api.post(`/threads/${threadId}/unarchive`);
  return data.thread;
};

export const lockThread = async (threadId) => {
  const { data } = await api.post(`/threads/${threadId}/lock`);
  return data.thread;
};

export const unlockThread = async (threadId) => {
  const { data } = await api.post(`/threads/${threadId}/unlock`);
  return data.thread;
};

export const joinThread = async (threadId) => {
  const { data } = await api.post(`/threads/${threadId}/join`);
  return data;
};

export const leaveThread = async (threadId) => {
  const { data } = await api.post(`/threads/${threadId}/leave`);
  return data;
};

export const listThreadMessages = async (threadId, params = {}) => {
  const { data } = await api.get(`/threads/${threadId}/messages`, { params });
  return data; // { messages, nextCursor }
};

export const listThreadPins = async (threadId) => {
  const { data } = await api.get(`/threads/${threadId}/pins`);
  return data.messages;
};
