import { cloudinary } from "../config/cloudinary.js";
import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";
import { hasPermission, PERMISSIONS } from "../constants/permissions.js";
import { resolveMemberPermissions } from "../middleware/serverAuth.js";
import { extensionOf } from "../middleware/uploadResource.js";
import { RESOURCE_KINDS } from "../models/Resource.js";
import * as resourceRepository from "../repositories/resource.repository.js";
import * as resourceTextService from "../services/resourceText.service.js";
import { emitToRoom, serverRoom } from "../sockets/emitters.js";

const KIND_BY_EXTENSION = Object.freeze({
  ".pdf": RESOURCE_KINDS.PDF,
  ".txt": RESOURCE_KINDS.TEXT,
  ".md": RESOURCE_KINDS.TEXT,
  ".docx": RESOURCE_KINDS.DOCUMENT,
  ".pptx": RESOURCE_KINDS.SLIDES,
  ".png": RESOURCE_KINDS.IMAGE,
  ".jpg": RESOURCE_KINDS.IMAGE,
  ".jpeg": RESOURCE_KINDS.IMAGE,
  ".webp": RESOURCE_KINDS.IMAGE,
});

/** Streams an in-memory buffer to Cloudinary. */
const uploadBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) =>
      err ? reject(err) : resolve(result)
    );
    stream.end(buffer);
  });

const slugify = (name) =>
  name
    .replace(/\.[^.]*$/, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "resource";

export const uploadResource = async (server, uploader, file, { title, description, tags }) => {
  const extension = extensionOf(file.originalname);
  const kind = KIND_BY_EXTENSION[extension];
  if (!kind) throw ApiError.badRequest("Unsupported file type");

  const isImage = kind === RESOURCE_KINDS.IMAGE;
  const publicId = `${slugify(file.originalname)}-${Date.now()}${isImage ? "" : extension}`;

  // Cloud upload and text extraction run in parallel off the same buffer
  const [uploaded, extracted] = await Promise.all([
    uploadBuffer(file.buffer, {
      folder: `codecord/resources/${server._id}`,
      resource_type: isImage ? "image" : "raw",
      public_id: publicId,
    }).catch((err) => {
      logger.error(`resource upload to Cloudinary failed: ${err.message}`);
      throw ApiError.internal("File storage failed, please try again");
    }),
    resourceTextService.extractText({ buffer: file.buffer, extension }),
  ]);

  const resource = await resourceRepository.create({
    serverId: server._id,
    uploaderId: uploader._id,
    title,
    description,
    tags,
    kind,
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    fileUrl: uploaded.secure_url,
    publicId: uploaded.public_id,
    resourceType: isImage ? "image" : "raw",
    textStatus: extracted.textStatus,
    textContent: extracted.textContent,
  });

  const populated = await resourceRepository.findById(resource._id);
  emitToRoom(serverRoom(server._id), "resource:created", { resource: populated });
  return populated;
};

export const listResources = (server, query) =>
  resourceRepository.findByServer(server._id, query);

/** Loads a resource and asserts it belongs to the request's server. */
export const getResourceInServer = async (server, resourceId) => {
  const resource = await resourceRepository.findById(resourceId);
  if (!resource || resource.serverId.toString() !== server._id.toString()) {
    throw ApiError.notFound("Resource not found in this server");
  }
  return resource;
};

/** Uploader manages their own materials; MANAGE_SERVER moderates all. */
const assertCanManage = async (server, membership, userId, resource) => {
  const uploaderId = resource.uploaderId._id ?? resource.uploaderId;
  if (uploaderId.toString() === userId.toString()) return;
  const bitfield = await resolveMemberPermissions(server, membership);
  if (!hasPermission(bitfield, PERMISSIONS.MANAGE_SERVER)) {
    throw ApiError.forbidden("Only the uploader or a server manager can do this");
  }
};

export const updateResource = async (server, membership, userId, resourceId, update) => {
  const resource = await getResourceInServer(server, resourceId);
  await assertCanManage(server, membership, userId, resource);
  const updated = await resourceRepository.updateById(resource._id, update);
  emitToRoom(serverRoom(server._id), "resource:updated", { resource: updated });
  return updated;
};

export const deleteResource = async (server, membership, userId, resourceId) => {
  const resource = await getResourceInServer(server, resourceId);
  await assertCanManage(server, membership, userId, resource);
  await resourceRepository.deleteById(resource._id);
  // Best-effort: the DB record is the source of truth for the app
  cloudinary.uploader
    .destroy(resource.publicId, { resource_type: resource.resourceType })
    .catch((err) => logger.warn(`Cloudinary cleanup failed for ${resource.publicId}: ${err.message}`));
  emitToRoom(serverRoom(server._id), "resource:deleted", {
    resourceId: resource._id,
    serverId: server._id,
  });
};

/** Attachment URL so browsers download instead of rendering inline. */
export const getDownloadUrl = async (server, resourceId) => {
  const resource = await getResourceInServer(server, resourceId);
  const url = cloudinary.url(resource.publicId, {
    resource_type: resource.resourceType,
    secure: true,
    flags: `attachment:${slugify(resource.originalName)}`,
  });
  return { resource, url };
};
