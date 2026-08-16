import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";
import { slugify } from "../utils/cloudinaryUpload.js";
import { storeBuffer } from "../utils/storage.util.js";
import { extensionOf, isImageExtension } from "../middleware/uploadAttachment.js";

/**
 * Uploads a single chat attachment (Cloudinary with a local-disk fallback)
 * and returns the metadata shape a message references (see attachmentSchema
 * in message.validation.js). Upload happens ahead of message creation: the
 * client posts the file here first, then sends the message (REST or socket)
 * with the returned metadata.
 */
export const uploadAttachment = async (uploader, file) => {
  const extension = extensionOf(file.originalname);
  const isImage = isImageExtension(extension);
  const publicId = `${slugify(file.originalname)}-${Date.now()}`;

  const uploaded = await storeBuffer(file.buffer, {
    folder: `codecord/attachments/${uploader._id}`,
    resourceType: isImage ? "image" : "raw",
    publicId,
    extension,
  }).catch((err) => {
    logger.error(`attachment storage failed: ${err.message}`);
    throw ApiError.internal("File upload failed, please try again");
  });

  return {
    url: uploaded.url,
    publicId: uploaded.publicId,
    resourceType: isImage ? "image" : "raw",
    mimeType: file.mimetype,
    originalName: file.originalname,
    sizeBytes: file.size,
    ...(uploaded.width ? { width: uploaded.width } : {}),
    ...(uploaded.height ? { height: uploaded.height } : {}),
  };
};
