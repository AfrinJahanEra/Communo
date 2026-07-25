import asyncHandler from "../utils/asyncHandler.js";
import { sendOk, sendCreated } from "../utils/response.js";
import * as aiService from "../services/ai.service.js";

export const createConversation = asyncHandler(async (req, res) => {
  const conversation = await aiService.createConversation(req.user, req.body);
  return sendCreated(res, "Conversation created", { conversation });
});

export const listConversations = asyncHandler(async (req, res) => {
  const conversations = await aiService.listConversations(req.user._id);
  return sendOk(res, "Conversations fetched", { conversations });
});

export const getConversationMessages = asyncHandler(async (req, res) => {
  const conversation = await aiService.getOwnedConversation(
    req.params.conversationId,
    req.user._id
  );
  const messages = await aiService.getMessages(conversation);
  return sendOk(res, "Messages fetched", { conversation, messages });
});

export const renameConversation = asyncHandler(async (req, res) => {
  const conversation = await aiService.getOwnedConversation(
    req.params.conversationId,
    req.user._id
  );
  const updated = await aiService.renameConversation(conversation, req.body.title);
  return sendOk(res, "Conversation renamed", { conversation: updated });
});

export const deleteConversation = asyncHandler(async (req, res) => {
  const conversation = await aiService.getOwnedConversation(
    req.params.conversationId,
    req.user._id
  );
  await aiService.deleteConversation(conversation);
  return sendOk(res, "Conversation deleted");
});

export const sendMessage = asyncHandler(async (req, res) => {
  const conversation = await aiService.getOwnedConversation(
    req.params.conversationId,
    req.user._id
  );
  const payload = await aiService.sendMessage(conversation, req.user, req.body);
  return sendCreated(res, "Message sent", payload);
});
