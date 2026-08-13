import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  googleAuthSchema,
} from "../validations/auth.validation.js";
import {
  register,
  login,
  verifyEmail,
  resendVerification,
  googleAuth,
  refresh,
  logout,
  logoutAll,
  getMe,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", authLimiter, validate({ body: registerSchema }), register);
router.post("/login", authLimiter, validate({ body: loginSchema }), login);

// POST, not GET: email scanners and link previewers follow GET links and would
// silently consume the single-use token before the user clicks it.
router.post("/verify-email", authLimiter, validate({ body: verifyEmailSchema }), verifyEmail);
router.post(
  "/resend-verification",
  authLimiter,
  validate({ body: resendVerificationSchema }),
  resendVerification
);
router.post("/google", authLimiter, validate({ body: googleAuthSchema }), googleAuth);

router.post("/refresh", authLimiter, refresh);
router.post("/logout", logout);
router.post("/logout-all", requireAuth, logoutAll);
router.get("/me", requireAuth, getMe);

export default router;