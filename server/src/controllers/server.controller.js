import asyncHandler from "../utils/asyncHandler.js";
import { sendOk, sendCreated } from "../utils/response.js";
import * as serverService from "../services/server.service.js";

export const createServer = asyncHandler(async (req, res) => {
  const server = await serverService.createServer(req.user._id, req.body);
  return sendCreated(res, "Server created", { server });
});

export const getMyServers = asyncHandler(async (req, res) => {
  const servers = await serverService.getMyServers(req.user._id);
  return sendOk(res, "Servers fetched", { servers });
});

export const discoverServers = asyncHandler(async (req, res) => {
  const servers = await serverService.discoverServers(req.validatedQuery);
  return sendOk(res, "Public servers fetched", { servers });
});

export const getServerDetails = asyncHandler(async (req, res) => {
  const { server, roles } = await serverService.getServerDetails(req.server);
  return sendOk(res, "Server fetched", { server, roles });
});

export const updateServer = asyncHandler(async (req, res) => {
  const server = await serverService.updateServer(req.server._id, req.body);
  return sendOk(res, "Server updated", { server });
});

export const deleteServer = asyncHandler(async (req, res) => {
  await serverService.deleteServer(req.server._id);
  return sendOk(res, "Server deleted");
});

export const joinPublicServer = asyncHandler(async (req, res) => {
  const server = await serverService.joinPublicServer(req.params.serverId, req.user._id);
  return sendOk(res, "Joined server", { server });
});

export const leaveServer = asyncHandler(async (req, res) => {
  await serverService.leaveServer(req.server, req.user._id);
  return sendOk(res, "Left server");
});

export const transferOwnership = asyncHandler(async (req, res) => {
  const server = await serverService.transferOwnership(req.server, req.body.newOwnerId);
  return sendOk(res, "Ownership transferred", { server });
});
