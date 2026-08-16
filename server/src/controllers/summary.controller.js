import asyncHandler from "../utils/asyncHandler.js";
import { sendOk } from "../utils/response.js";
import * as summaryService from "../services/summary.service.js";

export const summarizeChannel = asyncHandler(async (req, res) => {
  const summary = await summaryService.summarizeChannel(req.channel);
  return sendOk(res, "Channel summary generated", { summary });
});

export const summarizeDm = asyncHandler(async (req, res) => {
  const summary = await summaryService.summarizeDm(req.dm);
  return sendOk(res, "DM summary generated", { summary });
});
