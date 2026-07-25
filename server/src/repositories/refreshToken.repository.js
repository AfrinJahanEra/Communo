import RefreshToken from "../models/RefreshToken.js";

export const create = (data) => RefreshToken.create(data);

export const findByTokenHash = (tokenHash) => RefreshToken.findOne({ tokenHash });

export const revokeById = (id) =>
  RefreshToken.findByIdAndUpdate(id, { revokedAt: new Date() });

export const revokeFamily = (family) =>
  RefreshToken.updateMany({ family, revokedAt: null }, { revokedAt: new Date() });

export const revokeAllForUser = (userId) =>
  RefreshToken.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });

export const deleteByTokenHash = (tokenHash) => RefreshToken.deleteOne({ tokenHash });
