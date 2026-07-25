import api from "../lib/api";

// ---------- server-scoped ----------

export const createChannel = async (serverId, payload) => {
  const { data } = await api.post(`/servers/${serverId}/channels`, payload);
  return data.channel;
};

export const listChannels = async (serverId) => {
  const { data } = await api.get(`/servers/${serverId}/channels`);
  return data.channels;
};

export const reorderChannels = async (serverId, orderedIds) => {
  const { data } = await api.patch(`/servers/${serverId}/channels/positions`, { orderedIds });
  return data.channels;
};

// ---------- channel-scoped ----------

export const getChannel = async (channelId) => {
  const { data } = await api.get(`/channels/${channelId}`);
  return data.channel;
};

export const updateChannel = async (channelId, payload) => {
  const { data } = await api.patch(`/channels/${channelId}`, payload);
  return data.channel;
};

export const deleteChannel = async (channelId) => {
  const { data } = await api.delete(`/channels/${channelId}`);
  return data;
};

export const listChannelThreads = async (channelId, params = {}) => {
  const { data } = await api.get(`/channels/${channelId}/threads`, { params });
  return data.threads;
};

export const createThread = async (channelId, payload) => {
  const { data } = await api.post(`/channels/${channelId}/threads`, payload);
  return data.thread;
};

export const listChannelMessages = async (channelId, params = {}) => {
  const { data } = await api.get(`/channels/${channelId}/messages`, { params });
  return data; // { messages, nextCursor }
};

export const sendChannelMessage = async (channelId, content) => {
  const { data } = await api.post(`/channels/${channelId}/messages`, { content });
  return data.message;
};

export const listChannelPins = async (channelId) => {
  const { data } = await api.get(`/channels/${channelId}/pins`);
  return data.messages;
};

export const getVoiceParticipants = async (channelId) => {
  const { data } = await api.get(`/channels/${channelId}/voice`);
  return data.participants;
};
