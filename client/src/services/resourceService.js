import api from "../lib/api";

/**
 * Shared study resources, scoped per server:
 * /servers/:serverId/resources (membership enforced by the backend).
 */
const base = (serverId) => `/servers/${serverId}/resources`;

/**
 * Uploads a file with metadata as multipart form data.
 * onProgress receives 0-100 while the upload is in flight.
 */
export const uploadResource = async (serverId, { file, title, description, tags }, onProgress) => {
  const form = new FormData();
  form.append("file", file);
  form.append("title", title);
  if (description) form.append("description", description);
  if (tags?.length) form.append("tags", tags.join(","));
  const { data } = await api.post(base(serverId), form, {
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data.resource;
};

/** { resources, total, page, pages } with search / tag / pagination. */
export const listResources = async (serverId, params = {}) => {
  const { data } = await api.get(base(serverId), { params });
  return data;
};

export const getResource = async (serverId, resourceId) => {
  const { data } = await api.get(`${base(serverId)}/${resourceId}`);
  return data.resource;
};

/**
 * Downloads via the backend redirect to the attachment-flagged Cloudinary
 * URL; the browser follows the redirect so we receive the file as a Blob.
 */
export const downloadResource = async (serverId, resourceId) => {
  const res = await api.get(`${base(serverId)}/${resourceId}/download`, {
    responseType: "blob",
  });
  return res.data;
};

export const updateResource = async (serverId, resourceId, payload) => {
  const { data } = await api.patch(`${base(serverId)}/${resourceId}`, payload);
  return data.resource;
};

export const deleteResource = async (serverId, resourceId) => {
  const { data } = await api.delete(`${base(serverId)}/${resourceId}`);
  return data;
};
