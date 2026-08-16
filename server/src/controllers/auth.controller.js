import asyncHandler from "../utils/asyncHandler.js";
import { sendOk, sendCreated } from "../utils/response.js";
import * as authService from "../services/auth.service.js";
import {
  setAuthCookies,
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
} from "../utils/token.util.js";

const requestMeta = (req) => ({
  userAgent: req.headers["user-agent"] || "",
  ip: req.ip || "",
});

// @route POST /api/v1/auth/register
export const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken, requiresVerification } = await authService.register(
    req.body,
    requestMeta(req)
  );

  // No session is issued while the email is unverified
  if (accessToken) setAuthCookies(res, accessToken, refreshToken);

  sendCreated(
    res,
    requiresVerification
      ? "Registration successful. Enter the 6-digit code we emailed you."
      : "Registration successful",
    { user, accessToken: accessToken || null, requiresVerification: Boolean(requiresVerification) }
  );
});

// @route POST /api/v1/auth/login
export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body, requestMeta(req));
  setAuthCookies(res, accessToken, refreshToken);
  sendOk(res, "Login successful", { user, accessToken });
});

// @route POST /api/v1/auth/admin-login
export const adminLogin = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.adminLogin(
    req.body,
    requestMeta(req)
  );
  setAuthCookies(res, accessToken, refreshToken);
  sendOk(res, "Admin login successful", { user, accessToken });
});

// @route POST /api/v1/auth/verify-email
export const verifyEmail = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.verifyEmail(
    { email: req.body.email, code: req.body.code },
    requestMeta(req)
  );
  setAuthCookies(res, accessToken, refreshToken);
  sendOk(res, "Email verified successfully", { user, accessToken });
});

// @route POST /api/v1/auth/resend-verification
export const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerification(req.body.email);
  // Deliberately identical whether or not the account exists
  sendOk(res, "If that account exists and is unverified, a new code has been sent.");
});

// @route POST /api/v1/auth/google
export const googleAuth = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.googleAuth(
    req.body.credential,
    requestMeta(req)
  );
  setAuthCookies(res, accessToken, refreshToken);
  sendOk(res, "Signed in with Google", { user, accessToken });
});

// @route POST /api/v1/auth/refresh
export const refresh = asyncHandler(async (req, res) => {
  const presented = req.cookies?.[REFRESH_TOKEN_COOKIE];
  const { user, accessToken, refreshToken } = await authService.refresh(
    presented,
    requestMeta(req)
  );
  setAuthCookies(res, accessToken, refreshToken);
  sendOk(res, "Token refreshed", { user, accessToken });
});

// @route POST /api/v1/auth/logout
export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.[REFRESH_TOKEN_COOKIE]);
  clearAuthCookies(res);
  sendOk(res, "Logged out successfully");
});

// @route POST /api/v1/auth/logout-all
export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user._id);
  clearAuthCookies(res);
  sendOk(res, "Logged out from all devices");
});

// @route GET /api/v1/auth/me
export const getMe = asyncHandler(async (req, res) => {
  sendOk(res, "Profile fetched", { user: req.user });
});