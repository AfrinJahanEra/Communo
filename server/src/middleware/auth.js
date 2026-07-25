import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { verifyAccessToken, ACCESS_TOKEN_COOKIE } from "../utils/token.util.js";
import * as userRepository from "../repositories/user.repository.js";

const extractToken = (req) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return req.cookies?.[ACCESS_TOKEN_COOKIE] || null;
};

/** Verifies the access token and attaches the current user to req.user. */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw ApiError.unauthorized("Not authorized, no token provided");
  }

  const decoded = verifyAccessToken(token); // throws JWT errors → 401 via error handler
  if (decoded.type !== "access") {
    throw ApiError.unauthorized("Invalid token type");
  }

  const user = await userRepository.findById(decoded.sub);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized("Account not found or deactivated");
  }

  req.user = user;
  next();
});

/** Restricts a route to specific global roles, e.g. requireRole('admin'). */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(ApiError.forbidden("Insufficient permissions"));
  }
  next();
};
