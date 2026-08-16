import crypto from "crypto";
import env from "../config/env.js";
import { verifyGoogleIdToken } from "../config/google.js";
import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";
import * as userRepository from "../repositories/user.repository.js";
import * as refreshTokenRepository from "../repositories/refreshToken.repository.js";
import * as verificationTokenRepository from "../repositories/verificationToken.repository.js";
import { VERIFICATION_TOKEN_TYPES } from "../models/VerificationToken.js";
import { AUTH_PROVIDERS } from "../models/User.js";
import { GLOBAL_ROLES } from "../constants/roles.js";
import { sendVerificationEmail } from "./email.service.js";
import {
  signAccessToken,
  generateRefreshToken,
  generateVerificationCode,
  hashToken,
  refreshTokenExpiryDate,
  emailVerificationExpiryDate,
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

/**
 * Creates a fresh 6-digit verification code and emails it.
 * Any previous unused code for this user is dropped, so only the newest
 * code works. Only the SHA-256 hash is stored.
 */
const issueVerificationEmail = async (user) => {
  await verificationTokenRepository.deleteAllForUser(
    user._id,
    VERIFICATION_TOKEN_TYPES.EMAIL_VERIFICATION
  );

  const code = generateVerificationCode();

  await verificationTokenRepository.create({
    userId: user._id,
    tokenHash: hashToken(code),
    type: VERIFICATION_TOKEN_TYPES.EMAIL_VERIFICATION,
    expiresAt: emailVerificationExpiryDate(),
  });

  try {
    await sendVerificationEmail(user, code);
  } catch (error) {
    // The account already exists; a failed send should not roll it back.
    // The user can trigger /resend-verification instead.
    logger.error({ err: error, userId: user._id }, "Failed to send verification email");
  }
};

/** Constant-time comparison of two sha-256 hex hashes. */
const hashesMatch = (a, b) => {
  const ba = Buffer.from(String(a), "hex");
  const bb = Buffer.from(String(b), "hex");
  return ba.length === bb.length && ba.length > 0 && crypto.timingSafeEqual(ba, bb);
};

/** Constant-time comparison of two plain strings (secret-key checks). */
const stringsMatch = (a, b) => {
  const ba = Buffer.from(String(a), "utf8");
  const bb = Buffer.from(String(b), "utf8");
  return ba.length === bb.length && ba.length > 0 && crypto.timingSafeEqual(ba, bb);
};

/** Builds a unique username from an email local part, e.g. "john.doe" -> "john.doe2". */
const generateUniqueUsername = async (seed) => {
  let base = String(seed)
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 24);

  if (base.length < 3) base = `user${base}`;

  let candidate = base;
  let attempt = 0;

  // Bounded loop; the unique index is still the final authority
  while (await userRepository.findByUsername(candidate)) {
    attempt += 1;
    if (attempt > 20) {
      candidate = `${base.slice(0, 20)}${crypto.randomBytes(4).toString("hex")}`;
      break;
    }
    candidate = `${base.slice(0, 26)}${attempt}`;
  }

  return candidate;
};

/**
 * Registration/login is restricted to institutional emails (e.g. @iut-dhaka.edu).
 * Skipped when ALLOWED_EMAIL_DOMAINS is empty.
 */
const assertAllowedEmail = (email) => {
  if (env.ALLOWED_EMAIL_DOMAINS.length === 0) return;

  const domain = String(email).toLowerCase().split("@")[1];
  if (!env.ALLOWED_EMAIL_DOMAINS.includes(domain)) {
    const allowed = env.ALLOWED_EMAIL_DOMAINS.map((d) => `@${d}`).join(" or ");
    throw ApiError.forbidden(`Only ${allowed} email addresses can register or log in`, [
      { field: "email", code: "EMAIL_DOMAIN_NOT_ALLOWED", message: `Email must end with ${allowed}` },
    ]);
  }
};

export const register = async ({ username, email, password }, meta) => {
  assertAllowedEmail(email);

  const existingUser = await userRepository.findByEmailOrUsername(email, username);
  if (existingUser) {
    throw ApiError.conflict(
      existingUser.email === email ? "Email already registered" : "Username already taken"
    );
  }

  const user = await userRepository.create({
    username,
    email,
    password,
    authProvider: AUTH_PROVIDERS.LOCAL,
  });

  await issueVerificationEmail(user);

  // With verification required, no session is issued until the email is confirmed
  if (env.REQUIRE_EMAIL_VERIFICATION) {
    return { user, requiresVerification: true };
  }

  const tokens = await issueTokenPair(user, meta);
  return { user, ...tokens, requiresVerification: false };
};

export const login = async ({ email, password }, meta) => {
  assertAllowedEmail(email);

  const user = await userRepository.findByEmail(email, { withPassword: true });

  // Generic message on both branches — no user enumeration
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Invalid email or password");
  }
  if (!user.isActive) {
    throw ApiError.forbidden("Account is deactivated");
  }
  if (env.REQUIRE_EMAIL_VERIFICATION && !user.isEmailVerified) {
    throw ApiError.forbidden("Please verify your email address before logging in", [
      { field: "email", code: "EMAIL_NOT_VERIFIED", message: "Email not verified" },
    ]);
  }

  const tokens = await issueTokenPair(user, meta);
  return { user, ...tokens };
};

/**
 * Separate admin sign-in: the configured admin email plus the secret key from
 * .env. No password, no email verification, and it never touches the domain
 * restriction used for regular users. Anyone holding the key logs in as the
 * same shared admin account.
 */
export const adminLogin = async ({ email, secretKey }, meta) => {
  const emailMatches = stringsMatch(email.toLowerCase(), env.ADMIN_EMAIL);
  const keyMatches = stringsMatch(secretKey, env.ADMIN_SECRET_KEY);

  // Same generic message either way — no account enumeration
  if (!emailMatches || !keyMatches) {
    throw ApiError.unauthorized("Invalid admin email or secret key");
  }

  let user = await userRepository.findByEmail(env.ADMIN_EMAIL);

  if (!user) {
    user = await userRepository.create({
      username: await generateUniqueUsername("admin"),
      email: env.ADMIN_EMAIL,
      // Unusable placeholder — admins authenticate with the secret key only
      password: crypto.randomBytes(24).toString("hex"),
      authProvider: AUTH_PROVIDERS.LOCAL,
      role: GLOBAL_ROLES.ADMIN,
      isEmailVerified: true,
      displayName: "Administrator",
    });
  } else if (user.role !== GLOBAL_ROLES.ADMIN) {
    user = await userRepository.updateById(user._id, { role: GLOBAL_ROLES.ADMIN });
  }

  if (!user.isActive) {
    throw ApiError.forbidden("Account is deactivated");
  }

  const tokens = await issueTokenPair(user, meta);
  return { user, ...tokens };
};

/** Confirms the emailed 6-digit code and logs the user in, so they land straight in the app. */
export const verifyEmail = async ({ email, code }, meta) => {
  const invalid = ApiError.badRequest(
    "That code is invalid or has expired. Request a new one."
  );

  const user = await userRepository.findByEmail(email);
  if (!user) throw invalid;
  if (!user.isActive) throw ApiError.forbidden("Account is deactivated");
  assertAllowedEmail(user.email);

  // Already verified (e.g. re-opening the page) — just sign them in.
  if (user.isEmailVerified) {
    const tokens = await issueTokenPair(user, meta);
    return { user, ...tokens };
  }

  const stored = await verificationTokenRepository.findLatestForUser(user._id);

  if (!stored || stored.type !== VERIFICATION_TOKEN_TYPES.EMAIL_VERIFICATION) throw invalid;
  if (stored.usedAt) throw invalid;
  if (stored.expiresAt < new Date()) throw invalid;
  if (!hashesMatch(stored.tokenHash, hashToken(code))) throw invalid;

  await verificationTokenRepository.markUsed(stored._id);

  const verifiedUser = await userRepository.updateById(user._id, { isEmailVerified: true });

  const tokens = await issueTokenPair(verifiedUser, meta);
  return { user: verifiedUser, ...tokens };
};

/**
 * Resends the verification code. Always resolves the same way regardless of
 * whether the address exists, so this endpoint cannot be used to discover
 * registered emails.
 */
export const resendVerification = async (email) => {
  const user = await userRepository.findByEmail(email);

  if (!user || user.isEmailVerified || !user.isActive) return;
  if (user.authProvider === AUTH_PROVIDERS.GOOGLE) return;

  // Cheap per-account throttle on top of the IP rate limiter
  const sentInLastHour = await verificationTokenRepository.countRecentForUser(
    user._id,
    new Date(Date.now() - 60 * 60 * 1000)
  );
  if (sentInLastHour >= 5) {
    logger.warn({ userId: user._id }, "Verification resend throttled");
    return;
  }

  await issueVerificationEmail(user);
};

/**
 * Signs in (or signs up) with a Google ID token from the browser.
 * Linking by email is safe here because Google confirmed ownership of it.
 */
export const googleAuth = async (credential, meta) => {
  const profile = await verifyGoogleIdToken(credential);
  assertAllowedEmail(profile.email);

  let user = await userRepository.findByGoogleId(profile.googleId);

  if (!user) {
    const existingByEmail = await userRepository.findByEmail(profile.email);

    if (existingByEmail) {
      // Existing local account — attach the Google identity to it
      user = await userRepository.updateById(existingByEmail._id, {
        googleId: profile.googleId,
        isEmailVerified: true,
        ...(existingByEmail.avatar ? {} : { avatar: profile.picture }),
        ...(existingByEmail.displayName ? {} : { displayName: profile.name }),
      });
    } else {
      user = await userRepository.create({
        username: await generateUniqueUsername(profile.email.split("@")[0]),
        email: profile.email,
        authProvider: AUTH_PROVIDERS.GOOGLE,
        googleId: profile.googleId,
        isEmailVerified: true,
        displayName: profile.name,
        avatar: profile.picture,
      });
    }
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