import VerificationToken, { VERIFICATION_TOKEN_TYPES } from "../models/VerificationToken.js";

export const create = (data) => VerificationToken.create(data);

export const findByTokenHash = (tokenHash) => VerificationToken.findOne({ tokenHash });

/** Most recent token of a type for a user (used by the code-entry flow). */
export const findLatestForUser = (
  userId,
  type = VERIFICATION_TOKEN_TYPES.EMAIL_VERIFICATION
) => VerificationToken.findOne({ userId, type }).sort({ createdAt: -1 });

export const markUsed = (id) =>
  VerificationToken.findByIdAndUpdate(id, { usedAt: new Date() }, { returnDocument: "after" });

/** Invalidates older links when a new one is issued (resend). */
export const deleteAllForUser = (userId, type = VERIFICATION_TOKEN_TYPES.EMAIL_VERIFICATION) =>
  VerificationToken.deleteMany({ userId, type });

/** Used to throttle resends beyond the IP-based rate limiter. */
export const countRecentForUser = (
  userId,
  since,
  type = VERIFICATION_TOKEN_TYPES.EMAIL_VERIFICATION
) => VerificationToken.countDocuments({ userId, type, createdAt: { $gte: since } });