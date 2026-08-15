import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { uploadAttachment as uploadMiddleware } from "../middleware/uploadAttachment.js";
import { uploadAttachment } from "../controllers/attachment.controller.js";

/**
 * Uploads a file for use as a chat attachment (DM or channel/thread
 * message). Any authenticated user may upload — access to the message
 * itself is enforced when the message is actually sent, same as Discord's
 * CDN-first attachment flow.
 */
const router = Router();

router.use(requireAuth);

router.post("/", uploadMiddleware.single("file"), uploadAttachment);

export default router;
