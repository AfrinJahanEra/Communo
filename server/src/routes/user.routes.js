import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadAvatar } from "../middleware/uploadAvatar.js";
import {
  updateProfileSchema,
  changePasswordSchema,
  userIdParamSchema,
} from "../validations/user.validation.js";
import {
  getMe,
  updateMe,
  updateAvatar,
  changePassword,
  getUserById,
} from "../controllers/user.controller.js";

const router = Router();

router.use(requireAuth); // every user route requires authentication

router.get("/me", getMe);
router.patch("/me", validate({ body: updateProfileSchema }), updateMe);
router.post("/me/avatar", uploadAvatar.single("avatar"), updateAvatar);
router.patch("/me/password", validate({ body: changePasswordSchema }), changePassword);
router.get("/:id", validate({ params: userIdParamSchema }), getUserById);

export default router;
