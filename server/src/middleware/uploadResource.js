import multer from "multer";
import ApiError from "../utils/ApiError.js";

export const MAX_RESOURCE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Allow-list for study materials. Extension AND MIME type must both match
 * (some browsers send generic octet-stream, which we accept per-extension).
 */
const ALLOWED_TYPES = Object.freeze({
  ".pdf": ["application/pdf"],
  ".txt": ["text/plain"],
  ".md": ["text/markdown", "text/plain"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"],
});

export const extensionOf = (filename = "") => {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
};

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
 * Memory storage on purpose: the buffer is streamed to Cloudinary AND fed
 * to the text-extraction pipeline in parallel, without touching disk.
 */
export const uploadResource = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESOURCE_SIZE, files: 1 },
  fileFilter,
});
