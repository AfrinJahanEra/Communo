import api from "../lib/api";

/**
 * Collaborative workspace REST API. Mounted per server:
 * /servers/:serverId/workspace (membership enforced by the backend).
 * Realtime editing happens over Socket.IO (see hooks/useWorkspace).
 */
const base = (serverId) => `/servers/${serverId}/workspace`;

/** { workspace, files, participants, languages } — languages is the registry. */
export const getWorkspace = async (serverId) => {
  const { data } = await api.get(base(serverId));
  return data;
};

export const createFile = async (serverId, payload) => {
  const { data } = await api.post(`${base(serverId)}/files`, payload);
  return data.file;
};

/** { file, content, version } — content served from the live doc if open. */
export const getFile = async (serverId, fileId) => {
  const { data } = await api.get(`${base(serverId)}/files/${fileId}`);
  return data;
};

export const renameFile = async (serverId, fileId, path) => {
  const { data } = await api.patch(`${base(serverId)}/files/${fileId}`, { path });
  return data.file;
};

export const deleteFile = async (serverId, fileId) => {
  const { data } = await api.delete(`${base(serverId)}/files/${fileId}`);
  return data;
};

/**
 * Folders are identified by path, not id (most are purely virtual, derived
 * client-side from file paths) — see server workspace.service.js.
 */
export const createFolder = async (serverId, payload) => {
  const { data } = await api.post(`${base(serverId)}/folders`, payload);
  return data.folder;
};

/** Renames/moves a whole folder subtree. Returns every file/folder that moved. */
export const renameFolder = async (serverId, from, to) => {
  const { data } = await api.patch(`${base(serverId)}/folders`, { from, to });
  return data.files;
};

export const deleteFolder = async (serverId, path) => {
  const { data } = await api.delete(`${base(serverId)}/folders`, { params: { path } });
  return data;
};

export const saveFile = async (serverId, fileId) => {
  const { data } = await api.post(`${base(serverId)}/files/${fileId}/save`);
  return data;
};

export const getFileHistory = async (serverId, fileId) => {
  const { data } = await api.get(`${base(serverId)}/files/${fileId}/history`);
  return data.snapshots;
};

/** Downloads a file as a Blob (server sets filename + mime headers). */
export const downloadFile = async (serverId, fileId) => {
  const res = await api.get(`${base(serverId)}/files/${fileId}/download`, {
    responseType: "blob",
  });
  return res.data;
};

/**
 * Runs code through the backend JDoodle proxy.
 * payload: { fileId, stdin } or { source, language, stdin }.
 * Returns { status, output, cpuTime, memory }.
 */
export const execute = async (serverId, payload) => {
  const { data } = await api.post(`${base(serverId)}/execute`, payload);
  return data.result;
};
