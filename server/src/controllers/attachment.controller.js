import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { sendCreated } from "../utils/response.js";
import * as attachmentService from "../services/attachment.service.js";

export const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("A file is required");
  const attachment = await attachmentService.uploadAttachment(req.user, req.file);
  return sendCreated(res, "Attachment uploaded", { attachment });
});
