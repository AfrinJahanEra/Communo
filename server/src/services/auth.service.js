import crypto from "crypto";
import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";
import * as userRepository from "../repositories/user.repository.js";
import * as refreshTokenRepository from "../repositories/refreshToken.repository.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshTokenExpiryDate,
} from "../utils/token.util.js";

/** Issues an access/refresh token pair and persists the refresh token hash. */
const issueTokenPair = async (user, { family, userAgent = "", ip = "" } = {}) => {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();

  await refreshTokenRepository.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    family: family || crypto.randomUUID(),
    expiresAt: refreshTokenExpiryDate(),
    userAgent,
    ip,
  });

  return { accessToken, refreshToken };
};

export const register = async ({ username, email, password }, meta) => {
  const existingUser = await userRepository.findByEmailOrUsername(email, username);
  if (existingUser) {
    throw ApiError.conflict(
      existingUser.email === email ? "Email already registered" : "Username already taken"
    );
  }

  const user = await userRepository.create({ username, email, password });
  const tokens = await issueTokenPair(user, meta);

  return { user, ...tokens };
};

export const login = async ({ email, password }, meta) => {
  const user = await userRepository.findByEmail(email, { withPassword: true });

  // Generic message on both branches — no user enumeration
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Invalid email or password");
  }
  if (!user.isActive) {
    throw ApiError.forbidden("Account is deactivated");
  }

  const tokens = await issueTokenPair(user, meta);
  return { user, ...tokens };
};

/**
 * Rotates the refresh token: the presented token is revoked and a new pair
 * is issued within the same family. Reuse of an already-rotated token is
 * treated as theft and revokes the entire session family.
 */
export const refresh = async (presentedToken, meta) => {
  if (!presentedToken) {
    throw ApiError.unauthorized("Refresh token missing");
  }

  const stored = await refreshTokenRepository.findByTokenHash(hashToken(presentedToken));
  if (!stored) {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  if (stored.revokedAt) {
    // Token reuse detected — kill every session in this family
    await refreshTokenRepository.revokeFamily(stored.family);
    logger.warn({ userId: stored.userId, family: stored.family }, "Refresh token reuse detected");
    throw ApiError.unauthorized("Session compromised, please log in again");
  }

  if (stored.expiresAt < new Date()) {
    throw ApiError.unauthorized("Refresh token expired");
  }

  const user = await userRepository.findById(stored.userId);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized("Account not found or deactivated");
  }

  await refreshTokenRepository.revokeById(stored._id);
  const tokens = await issueTokenPair(user, { ...meta, family: stored.family });

  return { user, ...tokens };
};

export const logout = async (presentedToken) => {
  if (presentedToken) {
    await refreshTokenRepository.deleteByTokenHash(hashToken(presentedToken));
  }
};

export const logoutAll = async (userId) => {
  await refreshTokenRepository.revokeAllForUser(userId);
};
