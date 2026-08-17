import multer from "multer";
import ApiError from "../utils/ApiError.js";
import { extensionOf } from "./uploadAttachment.js";

const MAX_ICON_SIZE = 5 * 1024 * 1024; // 5MB

/** Server icons are images only; extension and MIME type must agree. */
const ALLOWED_TYPES = Object.freeze({
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".gif": ["image/gif"],
  ".webp": ["image/webp"],
});

const fileFilter = (req, file, cb) => {
  const ext = extensionOf(file.originalname);
  const allowedMimes = ALLOWED_TYPES[ext];
  if (!allowedMimes) {
    return cb(
      ApiError.badRequest(
        `Unsupported icon type "${ext || "unknown"}". Allowed: ${Object.keys(ALLOWED_TYPES).join(", ")}`
      )
    );
  }
  if (!allowedMimes.includes(file.mimetype) && file.mimetype !== "application/octet-stream") {
    return cb(ApiError.badRequest("File content type does not match its extension"));
  }
  cb(null, true);
};

/**
 * Memory storage on purpose: the buffer is handed to the storage layer
 * (Cloudinary with a local-disk fallback) without touching disk first.
 */
export const uploadServerIcon = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ICON_SIZE, files: 1 },
  fileFilter,
});
