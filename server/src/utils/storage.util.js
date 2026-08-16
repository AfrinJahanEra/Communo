import fsp from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import env from "../config/env.js";
import logger from "./logger.js";
import { cloudinary } from "../config/cloudinary.js";
import { uploadBuffer } from "./cloudinaryUpload.js";

/**
 * Storage with a local-disk fallback: uploads go to Cloudinary when the
 * credentials work, and transparently fall back to <server>/uploads (served
 * statically at /uploads by app.js) when Cloudinary rejects them — so a bad
 * API secret never takes file uploads down.
 */

const UPLOADS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "uploads");

const LOCAL_PREFIX = "local/";

export const isLocalPublicId = (publicId) => String(publicId).startsWith(LOCAL_PREFIX);

/** Keeps only safe characters and posix separators — no traversal possible. */
const sanitizeSegment = (segment) => segment.replace(/[^A-Za-z0-9_.-]+/g, "-");

/** ".png" / "png" -> ".png"; empty stays empty. */
const normalizeExtension = (extension = "") => {
  const clean = sanitizeSegment(String(extension).trim());
  if (!clean) return "";
  return clean.startsWith(".") ? clean : `.${clean}`;
};

export const storeBuffer = async (buffer, { folder, resourceType, publicId, extension = "" }) => {
  try {
    const uploaded = await uploadBuffer(buffer, {
      folder,
      resource_type: resourceType,
      public_id: publicId,
    });
    return { url: uploaded.secure_url, publicId: uploaded.public_id, width: uploaded.width, height: uploaded.height };
  } catch (err) {
    logger.warn(
      `Cloudinary upload failed (${err.message}); falling back to local storage`
    );

    // Keep the original extension locally so static serving gets the right
    // Content-Type (the Cloudinary public_id above stays extension-less).
    const relative = [
      ...folder.split("/").filter(Boolean).map(sanitizeSegment),
      sanitizeSegment(publicId) + normalizeExtension(extension),
    ].join("/");

    const absolute = path.join(UPLOADS_DIR, relative);
    await fsp.mkdir(path.dirname(absolute), { recursive: true });
    await fsp.writeFile(absolute, buffer);

    return { url: `${env.PUBLIC_URL}/uploads/${relative}`, publicId: LOCAL_PREFIX + relative };
  }
};

/** Best-effort cleanup for either backend; never throws. */
export const destroyStored = (publicId, resourceType = "raw") => {
  if (isLocalPublicId(publicId)) {
    const relative = String(publicId).slice(LOCAL_PREFIX.length);
    const absolute = path.join(UPLOADS_DIR, relative);
    if (!absolute.startsWith(path.resolve(UPLOADS_DIR) + path.sep)) {
      return Promise.resolve();
    }
    return fsp
      .rm(absolute, { force: true })
      .catch((err) => logger.warn(`Local file cleanup failed for ${publicId}: ${err.message}`));
  }

  return cloudinary.uploader
    .destroy(publicId, { resource_type: resourceType })
    .catch((err) => logger.warn(`Cloudinary cleanup failed for ${publicId}: ${err.message}`));
};

/**
 * Best-effort cleanup by URL: removes locally stored files, and leaves
 * external URLs (Cloudinary, Google profile pictures) untouched.
 */
export const destroyStoredUrl = (url) => {
  const base = `${env.PUBLIC_URL}/uploads/`;
  if (!url || !url.startsWith(base)) return Promise.resolve();
  return destroyStored(LOCAL_PREFIX + url.slice(base.length));
};
