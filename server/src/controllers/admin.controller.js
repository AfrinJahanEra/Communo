import asyncHandler from "../utils/asyncHandler.js";
import { sendOk } from "../utils/response.js";
import * as adminService from "../services/admin.service.js";

/** Shared pagination parsing for list endpoints. */
const listParams = (req) => ({
  search: String(req.query.search || ""),
  page: Math.max(1, Number.parseInt(req.query.page, 10) || 1),
  limit: Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25)),
});

// @route GET /api/v1/admin/overview
export const getOverview = asyncHandler(async (req, res) => {
  sendOk(res, "Overview fetched", { overview: await adminService.getOverview() });
});

// @route GET /api/v1/admin/users
export const listUsers = asyncHandler(async (req, res) => {
  sendOk(res, "Users fetched", await adminService.listUsers(listParams(req)));
});

// @route GET /api/v1/admin/servers
export const listServers = asyncHandler(async (req, res) => {
  sendOk(res, "Servers fetched", await adminService.listServers(listParams(req)));
});
