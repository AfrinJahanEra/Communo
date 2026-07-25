import ApiError from "../utils/ApiError.js";
import { languageForPath, mimeForLanguage } from "../constants/languages.js";
import * as workspaceRepository from "../repositories/workspace.repository.js";
import * as workspaceFileRepository from "../repositories/workspaceFile.repository.js";
import * as documentStore from "../sockets/documentStore.js";
import {
  emitToRooms,
  serverRoom,
  workspaceRoom,
} from "../sockets/emitters.js";

const MAX_FILES_PER_WORKSPACE = 100;

/** Tree/list events reach editor participants and server subscribers once. */
const emitWorkspaceEvent = (workspace, event, payload) =>
  emitToRooms(
    [serverRoom(workspace.serverId), workspaceRoom(workspace._id)],
    event,
    { workspaceId: workspace._id, serverId: workspace.serverId, ...payload }
  );

/** Public projection without content (tree entries, event payloads). */
const toMeta = (file) => ({
  _id: file._id,
  workspaceId: file.workspaceId,
  path: file.path,
  language: file.language,
  version: file.version,
  sizeBytes: file.sizeBytes,
  createdBy: file.createdBy,
  updatedBy: file.updatedBy,
  createdAt: file.createdAt,
  updatedAt: file.updatedAt,
});

/** Every server owns exactly one workspace, created on first access. */
export const getOrCreateWorkspace = async (server, userId) => {
  const existing = await workspaceRepository.findByServer(server._id);
  if (existing) return existing;
  try {
    return await workspaceRepository.create({
      serverId: server._id,
      name: `${server.name} Workspace`.slice(0, 100),
      createdBy: userId,
    });
  } catch (err) {
    // Two members opened the editor at once: the unique index wins the race
    if (err.code === 11000) return workspaceRepository.findByServer(server._id);
    throw err;
  }
};

export const listFiles = (workspaceId) => workspaceFileRepository.findByWorkspace(workspaceId);

/** Loads a file and asserts it belongs to this server's workspace. */
export const getFileInWorkspace = async (workspace, fileId) => {
  const file = await workspaceFileRepository.findById(fileId);
  if (!file || file.workspaceId.toString() !== workspace._id.toString()) {
    throw ApiError.notFound("File not found in this workspace");
  }
  return file;
};

const normalizePath = (path) =>
  path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");

export const createFile = async (workspace, userId, { path, content = "" }) => {
  const normalized = normalizePath(path);
  const count = await workspaceFileRepository.countByWorkspace(workspace._id);
  if (count >= MAX_FILES_PER_WORKSPACE) {
    throw ApiError.badRequest(
      `A workspace cannot exceed ${MAX_FILES_PER_WORKSPACE} files`
    );
  }
  const duplicate = await workspaceFileRepository.findByPath(workspace._id, normalized);
  if (duplicate) throw ApiError.conflict("A file with this path already exists");

  const file = await workspaceFileRepository.create({
    workspaceId: workspace._id,
    serverId: workspace.serverId,
    path: normalized,
    language: languageForPath(normalized),
    content,
    sizeBytes: Buffer.byteLength(content, "utf8"),
    createdBy: userId,
    updatedBy: userId,
  });
  emitWorkspaceEvent(workspace, "file:created", { file: toMeta(file) });
  return file;
};

export const renameFile = async (workspace, fileId, newPath, userId) => {
  const file = await getFileInWorkspace(workspace, fileId);
  const normalized = normalizePath(newPath);
  if (normalized === file.path) return file;
  const duplicate = await workspaceFileRepository.findByPath(workspace._id, normalized);
  if (duplicate) throw ApiError.conflict("A file with this path already exists");

  const updated = await workspaceFileRepository.updateById(file._id, {
    path: normalized,
    language: languageForPath(normalized),
    updatedBy: userId,
  });
  emitWorkspaceEvent(workspace, "file:renamed", {
    file: toMeta(updated),
    previousPath: file.path,
  });
  return updated;
};

export const deleteFile = async (workspace, fileId) => {
  const file = await getFileInWorkspace(workspace, fileId);
  documentStore.drop(file._id); // evict without saving: the file is gone
  await workspaceFileRepository.deleteById(file._id);
  emitWorkspaceEvent(workspace, "file:deleted", {
    fileId: file._id,
    path: file.path,
  });
};

/** Content + version served from the live document when the file is open. */
export const getFileWithContent = async (workspace, fileId) => {
  const file = await getFileInWorkspace(workspace, fileId);
  const { content, version } = documentStore.currentContent(file);
  return { file: toMeta(file), content, version };
};

/** Force-flush + checkpoint. Used by REST and the file:save socket event. */
export const saveFile = async (workspace, fileId, userId) => {
  const file = await getFileInWorkspace(workspace, fileId);
  await documentStore.flush(file._id);
  const { content, version } = documentStore.currentContent(file);
  const persisted =
    version === file.version ? file : await workspaceFileRepository.findById(file._id);
  await workspaceFileRepository.createSnapshot({
    fileId: file._id,
    workspaceId: workspace._id,
    version,
    content,
    savedBy: userId,
  });
  emitWorkspaceEvent(workspace, "file:saved", {
    fileId: file._id,
    path: persisted.path,
    version,
    savedBy: userId,
  });
  return { file: toMeta(persisted), version };
};

export const getFileHistory = async (workspace, fileId) => {
  const file = await getFileInWorkspace(workspace, fileId);
  return workspaceFileRepository.findSnapshots(file._id);
};

/** Download payload with the correct filename + Content-Type. */
export const getDownloadPayload = async (workspace, fileId, userId) => {
  const file = await getFileInWorkspace(workspace, fileId);
  const { content } = documentStore.currentContent(file);
  const filename = file.path.split("/").pop();
  emitWorkspaceEvent(workspace, "workspace:file-downloaded", {
    fileId: file._id,
    path: file.path,
    userId,
  });
  return { filename, mime: mimeForLanguage(file.language), content };
};
