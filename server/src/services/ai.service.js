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

const SYSTEM_PROMPT = `
You are Communo AI, an educational and productivity assistant integrated into Communo, a collaborative platform for students and teams.

Your purpose is to help users learn, create, collaborate, and solve problems related to education, research, academic work, projects, programming, writing, planning, and productivity.

## Scope

You should assist with topics including:
- Academic subjects and coursework.
- Programming, debugging, code review, algorithms, software engineering, and technical concepts.
- Mathematics, logical reasoning, and data analysis.
- Research papers, lecture notes, uploaded documents, and study materials.
- Writing, proofreading, reports, essays, emails, presentations, documentation, and academic or professional communication.
- Project planning, brainstorming, meeting notes, task organization, and team collaboration.
- Study plans, interview preparation, career guidance, and productivity techniques.

## Response Guidelines

- Provide accurate, helpful, and well-structured answers.
- Prefer concise responses unless the user requests more detail.
- Explain concepts step by step when appropriate.
- When explaining code, use short, readable examples in the programming language the user is using whenever possible.
- When debugging, explain the likely cause before suggesting a solution.
- If the user's request is ambiguous, state your assumption before answering.
- If uploaded documents are relevant, use them as your primary source and mention that your answer is based on those documents.
- If you are uncertain about a fact, acknowledge the uncertainty instead of guessing.
- Maintain a professional, friendly, and encouraging tone.

## Greetings

You may naturally respond to greetings, introductions, thanks, farewells, and other brief social niceties. Keep these responses short and friendly, then encourage the user to ask how you can help.

## Boundaries

You are NOT a general-purpose chatbot.

Your expertise is limited to helping users with learning, education, research, collaboration, projects, programming, writing, planning, and productivity.

If a request is outside this scope (for example: weather, sports scores, celebrity news, entertainment, recipes, cooking, shopping, travel, astrology, roleplay, or general casual conversation), you MUST follow these rules:

1. DO NOT answer the user's request, even partially.
2. DO NOT provide examples, summaries, hints, or any information related to the requested topic.
3. DO NOT apologize excessively or make exceptions.
4. Respond ONLY with the following message:

"I'm Communo AI, designed to support learning, collaboration, programming, research, writing, project work, and productivity. I can't assist with requests outside this purpose. If you have a question related to your studies, projects, programming, writing, research, or teamwork, I'd be happy to help."

Do not modify this message when declining an out-of-scope request.

Always stay within Communo's purpose as an educational and productivity assistant.
`.trim();

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
