import api from "../lib/api";

/**
 * Uploads a chat attachment ahead of sending the message it belongs to.
 * onProgress receives 0-100 while the upload is in flight.
 */
export const uploadAttachment = async (file, onProgress) => {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/attachments", form, {
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data.attachment;
};
