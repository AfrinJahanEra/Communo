import asyncHandler from "../utils/asyncHandler.js";
import { sendOk } from "../utils/response.js";
import * as userService from "../services/user.service.js";
import { clearAuthCookies } from "../utils/token.util.js";

// @route GET /api/v1/users/me
export const getMe = asyncHandler(async (req, res) => {
  sendOk(res, "Profile fetched", { user: req.user });
});

// @route PATCH /api/v1/users/me
export const updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body);
  sendOk(res, "Profile updated", { user });
});

// @route POST /api/v1/users/me/avatar
export const updateAvatar = asyncHandler(async (req, res) => {
  const user = await userService.updateAvatar(req.user._id, req.file?.path);
  sendOk(res, "Avatar updated", { user });
});

// @route PATCH /api/v1/users/me/password
export const changePassword = asyncHandler(async (req, res) => {
  await userService.changePassword(req.user._id, req.body);
  clearAuthCookies(res); // all sessions revoked → force re-login
  sendOk(res, "Password changed, please log in again");
});

// @route GET /api/v1/users/:id
export const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getPublicProfile(req.params.id);
  sendOk(res, "User fetched", { user });
});
