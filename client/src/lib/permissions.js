/** Mirror of the backend permission bitfield (constants/permissions.js). */
export const PERMISSIONS = Object.freeze({
  ADMINISTRATOR: 1 << 0,
  MANAGE_SERVER: 1 << 1,
  MANAGE_CHANNELS: 1 << 2,
  MANAGE_ROLES: 1 << 3,
  KICK_MEMBERS: 1 << 4,
  CREATE_INVITES: 1 << 5,
  VIEW_CHANNELS: 1 << 6,
  SEND_MESSAGES: 1 << 7,
  MANAGE_MESSAGES: 1 << 8,
  MANAGE_THREADS: 1 << 9,
  CONNECT_VOICE: 1 << 10,
});

export const PERMISSION_LABELS = [
  { bit: PERMISSIONS.ADMINISTRATOR, label: "Administrator" },
  { bit: PERMISSIONS.MANAGE_SERVER, label: "Manage Server" },
  { bit: PERMISSIONS.MANAGE_CHANNELS, label: "Manage Channels" },
  { bit: PERMISSIONS.MANAGE_ROLES, label: "Manage Roles" },
  { bit: PERMISSIONS.KICK_MEMBERS, label: "Kick Members" },
  { bit: PERMISSIONS.CREATE_INVITES, label: "Create Invites" },
  { bit: PERMISSIONS.VIEW_CHANNELS, label: "View Channels" },
  { bit: PERMISSIONS.SEND_MESSAGES, label: "Send Messages" },
  { bit: PERMISSIONS.MANAGE_MESSAGES, label: "Manage Messages" },
  { bit: PERMISSIONS.MANAGE_THREADS, label: "Manage Threads" },
  { bit: PERMISSIONS.CONNECT_VOICE, label: "Connect to Voice" },
];

export const hasPermission = (bitfield, permission) =>
  (bitfield & PERMISSIONS.ADMINISTRATOR) !== 0 || (bitfield & permission) === permission;

/**
 * Client-side effective permissions: owner → everything, else OR of the
 * member's roles plus the @everyone default role.
 */
export const computePermissions = (server, membership, roles, userId) => {
  if (!server || !userId) return 0;
  if (String(server.ownerId?._id ?? server.ownerId) === String(userId)) return ~0 >>> 0;
  if (!membership) return 0;
  const memberRoleIds = new Set((membership.roleIds || []).map((r) => String(r?._id ?? r)));
  return (roles || []).reduce((acc, role) => {
    if (role.isDefault || memberRoleIds.has(String(role._id))) return acc | role.permissions;
    return acc;
  }, 0);
};
