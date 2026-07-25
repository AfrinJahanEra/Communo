/**
 * Discord-style permission bitfield.
 * Stored as a Number on each Role; a member's effective permissions are
 * the bitwise OR of all their roles plus the server's default (@everyone) role.
 */
export const PERMISSIONS = Object.freeze({
  ADMINISTRATOR: 1 << 0, // implies every permission
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

export const ALL_PERMISSIONS = Object.values(PERMISSIONS).reduce((acc, p) => acc | p, 0);

/** Granted to the auto-created @everyone role of every new server. */
export const DEFAULT_MEMBER_PERMISSIONS =
  PERMISSIONS.VIEW_CHANNELS |
  PERMISSIONS.SEND_MESSAGES |
  PERMISSIONS.CREATE_INVITES |
  PERMISSIONS.CONNECT_VOICE;

export const DEFAULT_ROLE_NAME = "@everyone";

export const hasPermission = (bitfield, permission) =>
  (bitfield & PERMISSIONS.ADMINISTRATOR) !== 0 || (bitfield & permission) === permission;
