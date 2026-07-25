import User from "../models/User.js";

export const findById = (id) => User.findById(id);

export const findByEmail = (email, { withPassword = false } = {}) => {
  const query = User.findOne({ email });
  return withPassword ? query.select("+password") : query;
};

export const findByUsername = (username) => User.findOne({ username });

export const findByEmailOrUsername = (email, username) =>
  User.findOne({ $or: [{ email }, { username }] });

export const findByIdWithPassword = (id) => User.findById(id).select("+password");

export const create = (data) => User.create(data);

export const updateById = (id, update) =>
  User.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });

export const findPublicById = (id) =>
  User.findById(id).select("username displayName avatar bio lastSeenAt createdAt");
