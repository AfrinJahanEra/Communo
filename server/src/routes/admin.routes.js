import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { GLOBAL_ROLES } from "../constants/roles.js";
import { getOverview, listUsers, listServers } from "../controllers/admin.controller.js";

const router = Router();

// Every admin route requires a signed-in platform admin
router.use(requireAuth, requireRole(GLOBAL_ROLES.ADMIN));

router.get("/overview", getOverview);
router.get("/users", listUsers);
router.get("/servers", listServers);

export default router;
