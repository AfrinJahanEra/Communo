import { ZodError } from "zod";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";

/** 404 for unmatched routes. */
export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/** Normalizes known error shapes into ApiError. */
const normalizeError = (err) => {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return ApiError.badRequest("Validation failed", errors);
  }

  // Mongoose validation
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return ApiError.badRequest("Validation failed", errors);
  }

  // Mongo duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return ApiError.conflict(`${field} already exists`);
  }

  // Invalid ObjectId etc.
  if (err.name === "CastError") {
    return ApiError.badRequest(`Invalid value for ${err.path}`);
  }

  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return ApiError.unauthorized("Invalid or expired token");
  }

  // Multer upload errors (file too large, unexpected field, ...)
  if (err.name === "MulterError") {
    return ApiError.badRequest(
      err.code === "LIMIT_FILE_SIZE" ? "File too large (max 5MB)" : `Upload error: ${err.message}`
    );
  }

  // Cloudinary / storage engine errors (invalid credentials, rejected file, ...)
  if (err.http_code || Array.isArray(err.storageErrors)) {
    return new ApiError(502, `Media upload failed: ${err.message}`);
  }

  return null;
};

/** Centralized error handler — the single place errors become responses. */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const apiError = normalizeError(err);

  if (!apiError) {
    // Unknown/programmer error: log with stack, hide details from clients
    logger.error({ err, url: req.originalUrl }, "Unhandled error");
  }

  const finalError = apiError || ApiError.internal();

  res.status(finalError.statusCode).json({
    success: false,
    message: finalError.message,
    ...(finalError.errors.length > 0 && { errors: finalError.errors }),
    ...(env.isDevelopment && !apiError && { stack: err.stack }),
  });
};
