import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { sendOk, sendCreated } from "../utils/response.js";
import * as resourceService from "../services/resource.service.js";

export const uploadResource = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("A file is required");
  const resource = await resourceService.uploadResource(
    req.server,
    req.user,
    req.file,
    req.body
  );
  return sendCreated(res, "Resource uploaded", { resource });
});

export const listResources = asyncHandler(async (req, res) => {
  const payload = await resourceService.listResources(req.server, req.validatedQuery);
  return sendOk(res, "Resources fetched", payload);
});

export const getResource = asyncHandler(async (req, res) => {
  const resource = await resourceService.getResourceInServer(
    req.server,
    req.params.resourceId
  );
  return sendOk(res, "Resource fetched", { resource });
});

export const downloadResource = asyncHandler(async (req, res) => {
  const { url } = await resourceService.getDownloadUrl(req.server, req.params.resourceId);
  // Redirect to the attachment-flagged Cloudinary URL (no file proxying)
  return res.redirect(url);
});

export const updateResource = asyncHandler(async (req, res) => {
  const resource = await resourceService.updateResource(
    req.server,
    req.membership,
    req.user._id,
    req.params.resourceId,
    req.body
  );
  return sendOk(res, "Resource updated", { resource });
});

export const deleteResource = asyncHandler(async (req, res) => {
  await resourceService.deleteResource(
    req.server,
    req.membership,
    req.user._id,
    req.params.resourceId
  );
  return sendOk(res, "Resource deleted");
});
