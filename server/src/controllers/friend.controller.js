import asyncHandler from "../utils/asyncHandler.js";
import { sendOk, sendCreated } from "../utils/response.js";
import * as friendService from "../services/friend.service.js";

export const sendRequest = asyncHandler(async (req, res) => {
  const { request, autoAccepted } = await friendService.sendRequest(req.user, req.body);
  if (autoAccepted) {
    return sendOk(res, "Friend request accepted", { request });
  }
  return sendCreated(res, "Friend request sent", { request });
});

export const listRequests = asyncHandler(async (req, res) => {
  const { incoming, outgoing } = await friendService.listRequests(req.user._id);
  return sendOk(res, "Friend requests fetched", { incoming, outgoing });
});

export const acceptRequest = asyncHandler(async (req, res) => {
  const request = await friendService.acceptRequest(req.user, req.params.requestId);
  return sendOk(res, "Friend request accepted", { request });
});

export const removeRequest = asyncHandler(async (req, res) => {
  await friendService.removeRequest(req.user, req.params.requestId);
  return sendOk(res, "Friend request removed");
});

export const listFriends = asyncHandler(async (req, res) => {
  const friends = await friendService.listFriends(req.user._id);
  return sendOk(res, "Friends fetched", { friends });
});

export const removeFriend = asyncHandler(async (req, res) => {
  await friendService.removeFriend(req.user, req.params.userId);
  return sendOk(res, "Friend removed");
});

export const blockUser = asyncHandler(async (req, res) => {
  await friendService.blockUser(req.user, req.body.userId);
  return sendCreated(res, "User blocked");
});

export const unblockUser = asyncHandler(async (req, res) => {
  await friendService.unblockUser(req.user, req.params.userId);
  return sendOk(res, "User unblocked");
});

export const listBlocks = asyncHandler(async (req, res) => {
  const blocks = await friendService.listBlocks(req.user._id);
  return sendOk(res, "Blocked users fetched", { blocks });
});
