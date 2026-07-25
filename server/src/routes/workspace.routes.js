import { Router } from "express";
import validate from "../middleware/validate.js";
import { executeLimiter } from "../middleware/rateLimiter.js";
import {
  createFileSchema,
  renameFileSchema,
  executeSchema,
  fileIdParamSchema,
} from "../validations/workspace.validation.js";
import {
  getWorkspace,
  createFile,
  getFile,
  renameFile,
  deleteFile,
  saveFile,
  getFileHistory,
  downloadFile,
} from "../controllers/workspace.controller.js";
import { executeCode } from "../controllers/execution.controller.js";

/**
 * Mounted at /servers/:serverId/workspace inside server.routes.js, i.e.
 * after requireAuth + requireServerMember — every route below is already
 * membership-checked. Any member can collaborate (no extra permission bit).
 */
const router = Router({ mergeParams: true });

router.get("/", getWorkspace);

router.post("/files", validate({ body: createFileSchema }), createFile);
router.get("/files/:fileId", validate({ params: fileIdParamSchema }), getFile);
router.patch(
  "/files/:fileId",
  validate({ params: fileIdParamSchema, body: renameFileSchema }),
  renameFile
);
router.delete("/files/:fileId", validate({ params: fileIdParamSchema }), deleteFile);
router.post("/files/:fileId/save", validate({ params: fileIdParamSchema }), saveFile);
router.get(
  "/files/:fileId/history",
  validate({ params: fileIdParamSchema }),
  getFileHistory
);
router.get(
  "/files/:fileId/download",
  validate({ params: fileIdParamSchema }),
  downloadFile
);

router.post("/execute", executeLimiter, validate({ body: executeSchema }), executeCode);

export default router;
