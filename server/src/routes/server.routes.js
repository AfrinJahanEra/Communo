import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import {
  requireServerMember,
  requireServerPermission,
  requireServerOwner,
} from "../middleware/serverAuth.js";
import { PERMISSIONS } from "../constants/permissions.js";
import {
  createServerSchema,
  updateServerSchema,
  discoverQuerySchema,
  serverIdParamSchema,
  transferOwnershipSchema,
  memberParamSchema,
  listMembersQuerySchema,
  updateNicknameSchema,
  setMemberRolesSchema,
  roleParamSchema,
  createRoleSchema,
  updateRoleSchema,
  createInviteSchema,
} from "../validations/server.validation.js";
import {
  createServer,
  getMyServers,
  discoverServers,
  getServerDetails,
  updateServer,
  deleteServer,
  joinPublicServer,
  leaveServer,
  transferOwnership,
} from "../controllers/server.controller.js";
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  listMembers,
  updateNickname,
  setMemberRoles,
  kickMember,
  createInvite,
  listInvites,
} from "../controllers/serverExtras.controller.js";
import {
  createChannelSchema,
  reorderChannelsSchema,
} from "../validations/channel.validation.js";
import {
  createChannel,
  listChannels,
  reorderChannels,
} from "../controllers/channel.controller.js";
import { getServerPresence } from "../controllers/presence.controller.js";
import workspaceRoutes from "./workspace.routes.js";
import resourceRoutes from "./resource.routes.js";

const router = Router();

router.use(requireAuth); // every server route requires authentication

// ---------- servers ----------
router.post("/", validate({ body: createServerSchema }), createServer);
router.get("/", getMyServers);
router.get("/discover", validate({ query: discoverQuerySchema }), discoverServers);

router.post(
  "/:serverId/join",
  validate({ params: serverIdParamSchema }),
  joinPublicServer
);

// Member-scoped routes below: :serverId is validated + membership enforced
router.use("/:serverId", validate({ params: serverIdParamSchema }), requireServerMember);

router.get("/:serverId", getServerDetails);
router.patch(
  "/:serverId",
  requireServerPermission(PERMISSIONS.MANAGE_SERVER),
  validate({ body: updateServerSchema }),
  updateServer
);
router.delete("/:serverId", requireServerOwner, deleteServer);
router.post("/:serverId/leave", leaveServer);
router.post(
  "/:serverId/transfer-ownership",
  requireServerOwner,
  validate({ body: transferOwnershipSchema }),
  transferOwnership
);

// ---------- members ----------
router.get("/:serverId/members", validate({ query: listMembersQuerySchema }), listMembers);
router.get("/:serverId/presence", getServerPresence);
router.patch(
  "/:serverId/members/:userId",
  validate({ params: memberParamSchema, body: updateNicknameSchema }),
  updateNickname
);
router.put(
  "/:serverId/members/:userId/roles",
  validate({ params: memberParamSchema }),
  requireServerPermission(PERMISSIONS.MANAGE_ROLES),
  validate({ body: setMemberRolesSchema }),
  setMemberRoles
);
router.delete(
  "/:serverId/members/:userId",
  validate({ params: memberParamSchema }),
  requireServerPermission(PERMISSIONS.KICK_MEMBERS),
  kickMember
);

// ---------- roles ----------
router.get("/:serverId/roles", listRoles);
router.post(
  "/:serverId/roles",
  requireServerPermission(PERMISSIONS.MANAGE_ROLES),
  validate({ body: createRoleSchema }),
  createRole
);
router.patch(
  "/:serverId/roles/:roleId",
  validate({ params: roleParamSchema }),
  requireServerPermission(PERMISSIONS.MANAGE_ROLES),
  validate({ body: updateRoleSchema }),
  updateRole
);
router.delete(
  "/:serverId/roles/:roleId",
  validate({ params: roleParamSchema }),
  requireServerPermission(PERMISSIONS.MANAGE_ROLES),
  deleteRole
);

// ---------- channels ----------
router.get("/:serverId/channels", listChannels);
router.post(
  "/:serverId/channels",
  requireServerPermission(PERMISSIONS.MANAGE_CHANNELS),
  validate({ body: createChannelSchema }),
  createChannel
);
router.patch(
  "/:serverId/channels/positions",
  requireServerPermission(PERMISSIONS.MANAGE_CHANNELS),
  validate({ body: reorderChannelsSchema }),
  reorderChannels
);

// ---------- invites ----------
router.post(
  "/:serverId/invites",
  requireServerPermission(PERMISSIONS.CREATE_INVITES),
  validate({ body: createInviteSchema }),
  createInvite
);
router.get(
  "/:serverId/invites",
  requireServerPermission(PERMISSIONS.MANAGE_SERVER),
  listInvites
);

// ---------- collaborative workspace + shared resources (member-scoped) ----------
router.use("/:serverId/workspace", workspaceRoutes);
router.use("/:serverId/resources", resourceRoutes);

export default router;
