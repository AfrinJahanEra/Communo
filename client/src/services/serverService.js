import api from "../lib/api";

export const createServer = async (payload) => {
  const { data } = await api.post("/servers", payload);
  return data.server;
};

export const getMyServers = async () => {
  const { data } = await api.get("/servers");
  return data.servers;
};

export const discoverServers = async (params = {}) => {
  const { data } = await api.get("/servers/discover", { params });
  return data;
};

export const getServer = async (serverId) => {
  const { data } = await api.get(`/servers/${serverId}`);
  return data;
};

export const updateServer = async (serverId, payload) => {
  const { data } = await api.patch(`/servers/${serverId}`, payload);
  return data.server;
};

export const uploadServerIcon = async (serverId, file) => {
  const form = new FormData();
  form.append("icon", file);
  const { data } = await api.patch(`/servers/${serverId}/icon`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.server;
};

export const removeServerIcon = async (serverId) => {
  const { data } = await api.delete(`/servers/${serverId}/icon`);
  return data.server;
};

export const deleteServer = async (serverId) => {
  const { data } = await api.delete(`/servers/${serverId}`);
  return data;
};

export const joinPublicServer = async (serverId) => {
  const { data } = await api.post(`/servers/${serverId}/join`);
  return data;
};

export const leaveServer = async (serverId) => {
  const { data } = await api.post(`/servers/${serverId}/leave`);
  return data;
};

export const transferOwnership = async (serverId, newOwnerId) => {
  const { data } = await api.post(`/servers/${serverId}/transfer-ownership`, { newOwnerId });
  return data.server;
};

// ---------- members ----------

export const listMembers = async (serverId, params = {}) => {
  const { data } = await api.get(`/servers/${serverId}/members`, { params });
  return data;
};

export const getServerPresence = async (serverId) => {
  const { data } = await api.get(`/servers/${serverId}/presence`);
  return data.presences;
};

export const updateNickname = async (serverId, userId, nickname) => {
  const { data } = await api.patch(`/servers/${serverId}/members/${userId}`, { nickname });
  return data;
};

export const setMemberRoles = async (serverId, userId, roleIds) => {
  const { data } = await api.put(`/servers/${serverId}/members/${userId}/roles`, { roleIds });
  return data;
};

export const kickMember = async (serverId, userId) => {
  const { data } = await api.delete(`/servers/${serverId}/members/${userId}`);
  return data;
};

// ---------- roles ----------

export const listRoles = async (serverId) => {
  const { data } = await api.get(`/servers/${serverId}/roles`);
  return data.roles;
};

export const createRole = async (serverId, payload) => {
  const { data } = await api.post(`/servers/${serverId}/roles`, payload);
  return data.role;
};

export const updateRole = async (serverId, roleId, payload) => {
  const { data } = await api.patch(`/servers/${serverId}/roles/${roleId}`, payload);
  return data.role;
};

export const deleteRole = async (serverId, roleId) => {
  const { data } = await api.delete(`/servers/${serverId}/roles/${roleId}`);
  return data;
};

// ---------- invites ----------

export const createInvite = async (serverId, payload = {}) => {
  const { data } = await api.post(`/servers/${serverId}/invites`, payload);
  return data.invite;
};

export const listInvites = async (serverId) => {
  const { data } = await api.get(`/servers/${serverId}/invites`);
  return data.invites;
};

export const previewInvite = async (code) => {
  const { data } = await api.get(`/invites/${code}`);
  return data.invite;
};

export const joinByInvite = async (code) => {
  const { data } = await api.post(`/invites/${code}/join`);
  return data;
};

export const revokeInvite = async (code) => {
  const { data } = await api.delete(`/invites/${code}`);
  return data;
};
