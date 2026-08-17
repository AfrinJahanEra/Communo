import User from "../models/User.js";
import { GLOBAL_ROLES } from "../constants/roles.js";

export const findById = (id) => User.findById(id);

export const findByEmail = (email, { withPassword = false } = {}) => {
  const query = User.findOne({ email });
  return withPassword ? query.select("+password") : query;
};

export const findByUsername = (username) => User.findOne({ username });

export const findByGoogleId = (googleId) => User.findOne({ googleId });

export const findByEmailOrUsername = (email, username) =>
  User.findOne({ $or: [{ email }, { username }] });

export const searchByQuery = (query) =>
  User.find({
    isActive: true,
    role: { $ne: GLOBAL_ROLES.ADMIN },
    $or: [
      { username: { $regex: query, $options: "i" } },
      { displayName: { $regex: query, $options: "i" } },
    ],
  })
    .select("username displayName avatar")
    .sort({ username: 1 })
    .limit(8);

export const findByIdWithPassword = (id) => User.findById(id).select("+password");

export const create = (data) => User.create(data);

export const updateById = (id, update) =>
  User.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });

export const findPublicById = (id) =>
  User.findById(id).select("username displayName avatar bio lastSeenAt createdAt");