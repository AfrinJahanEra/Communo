import asyncHandler from "../utils/asyncHandler.js";
import { sendOk, sendCreated } from "../utils/response.js";
import * as workspaceService from "../services/workspace.service.js";
import { LANGUAGES } from "../constants/languages.js";
import * as workspaceState from "../sockets/workspaceState.js";

/** Resolves (and lazily creates) the workspace for req.server. */
const loadWorkspace = (req) =>
  workspaceService.getOrCreateWorkspace(req.server, req.user._id);

export const getWorkspace = asyncHandler(async (req, res) => {
  const workspace = await loadWorkspace(req);
  const files = await workspaceService.listFiles(workspace._id);
  const participants = workspaceState
    .getParticipants(workspace._id)
    .map(({ userId, username, displayName, avatar, color, activeFileId, joinedAt }) => ({
      userId,
      username,
      displayName,
      avatar,
      color,
      activeFileId,
      joinedAt,
    }));
  // languages ships the registry so Monaco + the run button need no hardcoding
  return sendOk(res, "Workspace fetched", {
    workspace,
    files,
    participants,
    languages: LANGUAGES,
  });
});

export const createFile = asyncHandler(async (req, res) => {
  const workspace = await loadWorkspace(req);
  const file = await workspaceService.createFile(workspace, req.user._id, req.body);
  return sendCreated(res, "File created", { file });
});

export const getFile = asyncHandler(async (req, res) => {
  const workspace = await loadWorkspace(req);
  const payload = await workspaceService.getFileWithContent(workspace, req.params.fileId);
  return sendOk(res, "File fetched", payload);
});

export const renameFile = asyncHandler(async (req, res) => {
  const workspace = await loadWorkspace(req);
  const file = await workspaceService.renameFile(
    workspace,
    req.params.fileId,
    req.body.path,
    req.user._id
  );
  return sendOk(res, "File renamed", { file });
});

export const deleteFile = asyncHandler(async (req, res) => {
  const workspace = await loadWorkspace(req);
  await workspaceService.deleteFile(workspace, req.params.fileId);
  return sendOk(res, "File deleted");
});

export const saveFile = asyncHandler(async (req, res) => {
  const workspace = await loadWorkspace(req);
  const payload = await workspaceService.saveFile(workspace, req.params.fileId, req.user._id);
  return sendOk(res, "File saved", payload);
});

export const getFileHistory = asyncHandler(async (req, res) => {
  const workspace = await loadWorkspace(req);
  const snapshots = await workspaceService.getFileHistory(workspace, req.params.fileId);
  return sendOk(res, "File history fetched", { snapshots });
});

export const downloadFile = asyncHandler(async (req, res) => {
  const workspace = await loadWorkspace(req);
  const { filename, mime, content } = await workspaceService.getDownloadPayload(
    workspace,
    req.params.fileId,
    req.user._id
  );
  res.setHeader("Content-Type", `${mime}; charset=utf-8`);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(filename)}"`
  );
  return res.send(content);
});
