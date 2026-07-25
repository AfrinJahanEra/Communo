import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import env from "../config/env.js";

const standardOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later" },
  // Limits only bite in production; dev/test runs (e2e suites) are exempt
  skip: () => !env.isProduction,
};

// External-API endpoints are limited per user (they run after requireAuth),
// falling back to IP for safety if a route is ever left unauthenticated.
const perUserKey = (req) => req.user?._id?.toString() ?? ipKeyGenerator(req.ip);

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

/** Code execution proxies to JDoodle: keep per-user usage sane. */
export const executeLimiter = rateLimit({
  ...standardOptions,
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: perUserKey,
  message: { success: false, message: "Execution limit reached, wait a minute and retry" },
});

/** AI prompts proxy to Groq: per-user budget. */
export const aiLimiter = rateLimit({
  ...standardOptions,
  windowMs: 5 * 60 * 1000,
  limit: 20,
  keyGenerator: perUserKey,
  message: { success: false, message: "AI request limit reached, please slow down" },
});
