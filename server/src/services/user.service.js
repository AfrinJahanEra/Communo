import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";
import { storeBuffer, destroyStoredUrl } from "../utils/storage.util.js";
import { extensionOf } from "../middleware/uploadAttachment.js";
import * as userRepository from "../repositories/user.repository.js";
import * as refreshTokenRepository from "../repositories/refreshToken.repository.js";

export const getProfile = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) throw ApiError.notFound("User not found");
  return user;
};

export const updateProfile = async (userId, { displayName, bio }) => {
  const update = {};
  if (displayName !== undefined) update.displayName = displayName;
  if (bio !== undefined) update.bio = bio;

  const user = await userRepository.updateById(userId, update);
  if (!user) throw ApiError.notFound("User not found");
  return user;
};

export const updateAvatar = async (userId, file) => {
  if (!file?.buffer) throw ApiError.badRequest("Avatar file is required");

  const stored = await storeBuffer(file.buffer, {
    folder: "codecord/avatars",
    resourceType: "image",
    publicId: `avatar-${userId}-${Date.now()}`,
    extension: extensionOf(file.originalname),
  }).catch((err) => {
    logger.error(`avatar storage failed: ${err.message}`);
    throw ApiError.internal("Avatar upload failed, please try again");
  });

  const previous = await userRepository.findById(userId);
  const user = await userRepository.updateById(userId, { avatar: stored.url });
  if (!user) throw ApiError.notFound("User not found");

  // Best-effort cleanup of a previously uploaded local avatar
  if (previous?.avatar) destroyStoredUrl(previous.avatar);

  return user;
};

export const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await userRepository.findByIdWithPassword(userId);
  if (!user) throw ApiError.notFound("User not found");

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw ApiError.unauthorized("Current password is incorrect");

  user.password = newPassword; // hashed by the pre-save hook
  await user.save();

  // Password change invalidates every other session
  await refreshTokenRepository.revokeAllForUser(userId);
};

export const getPublicProfile = async (userId) => {
  const user = await userRepository.findPublicById(userId);
  if (!user) throw ApiError.notFound("User not found");
  return user;
};
