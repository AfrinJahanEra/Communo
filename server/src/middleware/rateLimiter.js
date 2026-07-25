import rateLimit from "express-rate-limit";
import env from "../config/env.js";

const standardOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later" },
  // Limits only bite in production; dev/test runs (e2e suites) are exempt
  skip: () => !env.isProduction,
};

/** Global API limiter. */
export const generalLimiter = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000,
  limit: 300,
});

/** Stricter limiter for credential endpoints (login/register/refresh). */
export const authLimiter = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000,
  limit: 20,
});
