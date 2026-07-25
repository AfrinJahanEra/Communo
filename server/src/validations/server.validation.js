import { z } from "zod";
import { ALL_PERMISSIONS } from "../constants/permissions.js";

export const objectId = (label = "id") =>
  z.string().regex(/^[a-f\d]{24}$/i, `Invalid ${label}`);

export const serverIdParamSchema = z.object({
  serverId: objectId("server id"),
});

export const createServerSchema = z.object({
  name: z.string().trim().min(2, "Server name must be at least 2 characters").max(100),
  description: z.string().trim().max(500).optional().default(""),
  isPublic: z.boolean().optional().default(false),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional().default([]),
});

export const updateServerSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).optional(),
    isPublic: z.boolean().optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const discoverQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  tag: z.string().trim().max(30).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const transferOwnershipSchema = z.object({
  newOwnerId: objectId("user id"),
});

// ---------- members ----------

export const memberParamSchema = z.object({
  serverId: objectId("server id"),
  userId: objectId("user id"),
});

export const listMembersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const updateNicknameSchema = z.object({
  nickname: z.string().trim().max(32, "Nickname cannot exceed 32 characters"),
});

export const setMemberRolesSchema = z.object({
  roleIds: z.array(objectId("role id")).max(20),
});

// ---------- roles ----------

export const roleParamSchema = z.object({
  serverId: objectId("server id"),
  roleId: objectId("role id"),
});

const permissionsField = z
  .number()
  .int()
  .min(0)
  .max(ALL_PERMISSIONS, "Unknown permission bits");

export const createRoleSchema = z.object({
  name: z.string().trim().min(1, "Role name is required").max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value").optional(),
  permissions: permissionsField.optional(),
  position: z.number().int().min(0).max(1000).optional(),
});

export const updateRoleSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value").optional(),
    permissions: permissionsField.optional(),
    position: z.number().int().min(0).max(1000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ---------- invites ----------

export const createInviteSchema = z.object({
  maxUses: z.number().int().min(0).max(1000).optional().default(0),
  expiresInHours: z.number().min(1).max(24 * 30).optional(),
});

export const inviteCodeParamSchema = z.object({
  code: z.string().trim().min(4).max(32),
});
