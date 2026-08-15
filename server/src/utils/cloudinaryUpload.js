import { cloudinary } from "../config/cloudinary.js";

/** Streams an in-memory buffer to Cloudinary. */
export const uploadBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) =>
      err ? reject(err) : resolve(result)
    );
    stream.end(buffer);
  });

/** Filesystem/URL-safe stem for a Cloudinary public_id, capped to 60 chars. */
export const slugify = (name) =>
  name
    .replace(/\.[^.]*$/, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "file";
