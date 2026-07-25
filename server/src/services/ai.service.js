import ApiError from "../utils/ApiError.js";
import * as aiConversationRepository from "../repositories/aiConversation.repository.js";
import * as resourceRepository from "../repositories/resource.repository.js";
import * as serverRepository from "../repositories/server.repository.js";
import * as serverMemberRepository from "../repositories/serverMember.repository.js";
import * as groqService from "./groq.service.js";
import { AI_ROLES } from "../models/AiMessage.js";
import { TEXT_STATUS } from "../models/Resource.js";

const DEFAULT_TITLE = "New conversation";
const HISTORY_LIMIT = 20;
const RESOURCE_EXCERPT_CHARS = 8_000;
const AUTO_TITLE_CHARS = 50;

const SYSTEM_PROMPT = [
  "You are CodeCord's AI tutor for computer science students.",
  "Answer doubts clearly and step by step: explain concepts, algorithms, and code;",
  "help debug errors by explaining the cause before the fix; and summarize attached",
  "study material when asked. Prefer concise explanations with short code examples",
  "in the language the student is using. When a question is ambiguous, state your",
  "assumption and answer the most likely interpretation. If attached document",
  "context is relevant, ground your answer in it and say which document you used.",
].join(" ");

// ---------- conversations ----------

export const createConversation = async (user, { title, serverId }) => {
  if (serverId) {
    const server = await serverRepository.findById(serverId);
    if (!server) throw ApiError.notFound("Server not found");
    const membership = await serverMemberRepository.findMembership(serverId, user._id);
    if (!membership) throw ApiError.forbidden("You are not a member of this server");
  }
  return aiConversationRepository.createConversation({
    userId: user._id,
    serverId: serverId ?? null,
    ...(title ? { title } : {}),
  });
};

export const listConversations = (userId) =>
  aiConversationRepository.findConversationsByUser(userId);

/** Conversations are private: non-owners get a 404, never a 403. */
export const getOwnedConversation = async (conversationId, userId) => {
  const conversation = await aiConversationRepository.findConversationById(conversationId);
  if (!conversation || conversation.userId.toString() !== userId.toString()) {
    throw ApiError.notFound("Conversation not found");
  }
  return conversation;
};

export const getMessages = (conversation) =>
  aiConversationRepository.findMessages(conversation._id);

export const renameConversation = (conversation, title) =>
  aiConversationRepository.updateConversationById(conversation._id, { title });

export const deleteConversation = (conversation) =>
  aiConversationRepository.deleteConversationById(conversation._id);

// ---------- messaging ----------

/** Loads attached resources and verifies the user can read each one. */
const loadAttachedResources = async (user, resourceIds) => {
  if (!resourceIds?.length) return [];
  const resources = await resourceRepository.findByIdsWithText(resourceIds);
  if (resources.length !== resourceIds.length) {
    throw ApiError.notFound("One or more attached resources were not found");
  }
  const serverIds = [...new Set(resources.map((r) => r.serverId.toString()))];
  const memberships = await Promise.all(
    serverIds.map((serverId) => serverMemberRepository.findMembership(serverId, user._id))
  );
  if (memberships.some((membership) => !membership)) {
    throw ApiError.forbidden("You do not have access to one of the attached resources");
  }
  return resources;
};

const resourceContextBlock = (resource) => {
  const hasText =
    resource.textStatus === TEXT_STATUS.DONE && resource.textContent?.length > 0;
  const body = hasText
    ? resource.textContent.slice(0, RESOURCE_EXCERPT_CHARS)
    : "(no extractable text is available for this document)";
  return {
    role: "system",
    content: `Attached document "${resource.title}":\n${body}`,
  };
};

/**
 * One doubt-solver turn. Groq is called BEFORE anything is persisted so a
 * failed completion never leaves a dangling user message in the history.
 */
export const sendMessage = async (conversation, user, { content, resourceIds }) => {
  const resources = await loadAttachedResources(user, resourceIds);
  const history = await aiConversationRepository.findRecentMessages(
    conversation._id,
    HISTORY_LIMIT
  );

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...resources.map(resourceContextBlock),
    ...history.map((message) => ({ role: message.role, content: message.content })),
    { role: AI_ROLES.USER, content },
  ];

  const completion = await groqService.chatCompletion(messages);

  const userMessage = await aiConversationRepository.createMessage({
    conversationId: conversation._id,
    role: AI_ROLES.USER,
    content,
    resourceIds: resources.map((resource) => resource._id),
  });
  const assistantMessage = await aiConversationRepository.createMessage({
    conversationId: conversation._id,
    role: AI_ROLES.ASSISTANT,
    content: completion.content,
    tokens: completion.tokens,
  });

  const update = { lastActiveAt: new Date() };
  if (conversation.title === DEFAULT_TITLE) {
    // First exchange names the conversation after the opening question
    update.title =
      content.length > AUTO_TITLE_CHARS
        ? `${content.slice(0, AUTO_TITLE_CHARS).trimEnd()}…`
        : content;
  }
  const updated = await aiConversationRepository.updateConversationById(
    conversation._id,
    update
  );

  return { conversation: updated, userMessage, assistantMessage };
};
