import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { registerSchema, loginSchema } from "../validations/auth.validation.js";
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getMe,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", authLimiter, validate({ body: registerSchema }), register);
router.post("/login", authLimiter, validate({ body: loginSchema }), login);
router.post("/refresh", authLimiter, refresh);
router.post("/logout", logout);
router.post("/logout-all", requireAuth, logoutAll);
router.get("/me", requireAuth, getMe);

export default router;
