import crypto from "crypto";
import jwt from "jsonwebtoken";
import env from "../config/env.js";

export const ACCESS_TOKEN_COOKIE = "accessToken";
export const REFRESH_TOKEN_COOKIE = "refreshToken";

/** Short-lived JWT carrying identity + global role. */
export const signAccessToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role, type: "access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);

/** Opaque refresh token: random bytes, only its hash is persisted. */
export const generateRefreshToken = () => crypto.randomBytes(64).toString("hex");

/** Opaque single-use token for email links (verification, password reset). */
export const generateOpaqueToken = (bytes = 48) => crypto.randomBytes(bytes).toString("hex");

export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const refreshTokenExpiryDate = () =>
  new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

export const emailVerificationExpiryDate = () =>
  new Date(Date.now() + env.EMAIL_VERIFICATION_EXPIRES_HOURS * 60 * 60 * 1000);

const baseCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax",
};

export const accessTokenCookieOptions = {
  ...baseCookieOptions,
  maxAge: 15 * 60 * 1000,
};

export const refreshTokenCookieOptions = {
  ...baseCookieOptions,
  path: "/api", // sent only to API routes (covers /api and /api/v1 mounts)
  maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
};

export const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, accessTokenCookieOptions);
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshTokenCookieOptions);
};

export const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...baseCookieOptions });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...baseCookieOptions, path: "/api" });
  res.clearCookie("token", { ...baseCookieOptions }); // legacy cookie from the old auth flow
};