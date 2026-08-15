import multer from "multer";
import ApiError from "../utils/ApiError.js";

export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25MB
export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);

/**
 * Allow-list for chat attachments. Extension AND MIME type must both match
 * (some browsers send generic octet-stream, which we accept per-extension).
 */
const ALLOWED_TYPES = Object.freeze({
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".gif": ["image/gif"],
  ".webp": ["image/webp"],
  ".svg": ["image/svg+xml"],
  ".pdf": ["application/pdf"],
  ".txt": ["text/plain"],
  ".md": ["text/markdown", "text/plain"],
  ".csv": ["text/csv"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".ppt": ["application/vnd.ms-powerpoint"],
  ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ".zip": ["application/zip", "application/x-zip-compressed"],
});

export const extensionOf = (filename = "") => {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
};

export const isImageExtension = (extension) => IMAGE_EXTENSIONS.has(extension);

const fileFilter = (req, file, cb) => {
  const ext = extensionOf(file.originalname);
  const allowedMimes = ALLOWED_TYPES[ext];
  if (!allowedMimes) {
    return cb(
      ApiError.badRequest(
        `Unsupported file type "${ext || "unknown"}". Allowed: ${Object.keys(ALLOWED_TYPES).join(", ")}`
      )
    );
  }
  if (!allowedMimes.includes(file.mimetype) && file.mimetype !== "application/octet-stream") {
    return cb(ApiError.badRequest("File content type does not match its extension"));
  }
  cb(null, true);
};

/**
 * Memory storage on purpose: the buffer is streamed straight to Cloudinary
 * without touching disk (same pattern as the resource-library upload).
 */
export const uploadAttachment = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_SIZE, files: MAX_ATTACHMENTS_PER_MESSAGE },
  fileFilter,
});
