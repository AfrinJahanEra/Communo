import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { inviteCodeParamSchema } from "../validations/server.validation.js";
import {
  previewInvite,
  joinByInvite,
  revokeInvite,
} from "../controllers/serverExtras.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/:code", validate({ params: inviteCodeParamSchema }), previewInvite);
router.post("/:code/join", validate({ params: inviteCodeParamSchema }), joinByInvite);
router.delete("/:code", validate({ params: inviteCodeParamSchema }), revokeInvite);

export default router;
