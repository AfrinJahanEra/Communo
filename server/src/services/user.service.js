import ApiError from "../utils/ApiError.js";
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

export const updateAvatar = async (userId, avatarUrl) => {
  if (!avatarUrl) throw ApiError.badRequest("Avatar file is required");
  const user = await userRepository.updateById(userId, { avatar: avatarUrl });
  if (!user) throw ApiError.notFound("User not found");
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
