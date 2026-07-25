import asyncHandler from "../utils/asyncHandler.js";
import { sendOk, sendCreated } from "../utils/response.js";
import * as roleService from "../services/role.service.js";
import * as memberService from "../services/member.service.js";
import * as inviteService from "../services/invite.service.js";

// ---------- roles ----------

export const listRoles = asyncHandler(async (req, res) => {
  const roles = await roleService.listRoles(req.server._id);
  return sendOk(res, "Roles fetched", { roles });
});

export const createRole = asyncHandler(async (req, res) => {
  const role = await roleService.createRole(req.server._id, req.body);
  return sendCreated(res, "Role created", { role });
});

export const updateRole = asyncHandler(async (req, res) => {
  const role = await roleService.updateRole(req.server._id, req.params.roleId, req.body);
  return sendOk(res, "Role updated", { role });
});

export const deleteRole = asyncHandler(async (req, res) => {
  await roleService.deleteRole(req.server._id, req.params.roleId);
  return sendOk(res, "Role deleted");
});

// ---------- members ----------

export const listMembers = asyncHandler(async (req, res) => {
  const members = await memberService.listMembers(req.server._id, req.validatedQuery);
  return sendOk(res, "Members fetched", { members });
});

export const updateNickname = asyncHandler(async (req, res) => {
  const member = await memberService.updateNickname(req, req.params.userId, req.body.nickname);
  return sendOk(res, "Nickname updated", { member });
});

export const setMemberRoles = asyncHandler(async (req, res) => {
  const member = await memberService.setMemberRoles(req.server, req.params.userId, req.body.roleIds);
  return sendOk(res, "Member roles updated", { member });
});

export const kickMember = asyncHandler(async (req, res) => {
  await memberService.kickMember(req.server, req.user._id, req.params.userId);
  return sendOk(res, "Member kicked");
});

// ---------- invites ----------

export const createInvite = asyncHandler(async (req, res) => {
  const invite = await inviteService.createInvite(req.server._id, req.user._id, req.body);
  return sendCreated(res, "Invite created", { invite });
});

export const listInvites = asyncHandler(async (req, res) => {
  const invites = await inviteService.listInvites(req.server._id);
  return sendOk(res, "Invites fetched", { invites });
});

export const previewInvite = asyncHandler(async (req, res) => {
  const invite = await inviteService.previewInvite(req.params.code);
  return sendOk(res, "Invite fetched", { invite });
});

export const joinByInvite = asyncHandler(async (req, res) => {
  const server = await inviteService.joinByInvite(req.params.code, req.user._id);
  return sendOk(res, "Joined server", { server });
});

export const revokeInvite = asyncHandler(async (req, res) => {
  await inviteService.revokeInvite(req.params.code, req.user);
  return sendOk(res, "Invite revoked");
});
