import { Router } from "express";
import validate from "../middleware/validate.js";
import { uploadResource as uploadMiddleware } from "../middleware/uploadResource.js";
import {
  uploadResourceSchema,
  updateResourceSchema,
  listResourcesQuerySchema,
  resourceIdParamSchema,
} from "../validations/resource.validation.js";
import {
  uploadResource,
  listResources,
  getResource,
  downloadResource,
  updateResource,
  deleteResource,
} from "../controllers/resource.controller.js";

/**
 * Mounted at /servers/:serverId/resources inside server.routes.js, i.e.
 * after requireAuth + requireServerMember — resources never leak across
 * servers. Edit/delete additionally require uploader or MANAGE_SERVER.
 */
const router = Router({ mergeParams: true });

router.post(
  "/",
  uploadMiddleware.single("file"),
  validate({ body: uploadResourceSchema }),
  uploadResource
);
router.get("/", validate({ query: listResourcesQuerySchema }), listResources);
router.get("/:resourceId", validate({ params: resourceIdParamSchema }), getResource);
router.get(
  "/:resourceId/download",
  validate({ params: resourceIdParamSchema }),
  downloadResource
);
router.patch(
  "/:resourceId",
  validate({ params: resourceIdParamSchema, body: updateResourceSchema }),
  updateResource
);
router.delete(
  "/:resourceId",
  validate({ params: resourceIdParamSchema }),
  deleteResource
);

export default router;
