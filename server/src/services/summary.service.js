import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";
import * as messageRepository from "../repositories/message.repository.js";
import * as dmRepository from "../repositories/dm.repository.js";
import * as groqService from "./groq.service.js";

const MESSAGE_LIMIT = 50;

const SUMMARY_SYSTEM_PROMPT = `
You are Communo's chat summarization assistant.

You will be given a chronological transcript of a text channel, one message
per line in the form "name: message".

Produce a summary with these sections:
- overview: 2-10 sentences giving a short overview of the conversation.
- keyPoints: the main topics/points that were actually discussed.
- decisions: things the participants actually decided, not merely proposed
  or discussed. Leave empty if nothing was decided.
- actionItems: tasks with a clearly identified responsible person, as
  { "user": string, "task": string }. Only include an item when both the
  task and the owner are clearly stated in the transcript.
- unresolved: open questions or issues that were raised but not resolved.

Rules:
- Ignore greetings, farewells, small talk, and repeated/duplicate messages.
- Never invent information that is not present in the transcript.
- If a section has nothing to report, return it as an empty array.
- Respond with ONLY a single valid JSON object matching this exact shape,
  no markdown code fences, no commentary before or after:
  {"overview": string, "keyPoints": string[], "decisions": string[], "actionItems": [{"user": string, "task": string}], "unresolved": string[]}
`.trim();

const parseSummaryJson = (raw) => {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    return parsed;
  } catch (err) {
    logger.error(`Failed to parse summary JSON from Groq: ${err.message} | raw: ${raw}`);
    throw new ApiError(502, "The AI summary could not be generated, please try again");
  }
};

const messageLine = (message) => {
  const name = message.authorId?.displayName || message.authorId?.username || "Unknown";
  const text = message.content?.trim() || (message.attachments?.length ? "[shared an attachment]" : "");
  return text ? `${name}: ${text}` : null;
};

/** Shared Groq call + response shaping for a chronological list of messages. */
const generateSummary = async (newestFirst, transcriptLabel) => {
  if (newestFirst.length === 0) {
    return { overview: "No messages to summarize yet.", messageCount: 0 };
  }

  const chronological = [...newestFirst].reverse();
  const transcript = chronological.map(messageLine).filter(Boolean).join("\n");

  const messages = [
    { role: "system", content: SUMMARY_SYSTEM_PROMPT },
    { role: "user", content: `${transcriptLabel} (${chronological.length} messages):\n\n${transcript}` },
  ];

  const completion = await groqService.chatCompletion(messages);
  const parsed = parseSummaryJson(completion.content);

  return {
    overview: parsed.overview || "No summary could be generated.",
    ...(parsed.keyPoints?.length ? { keyPoints: parsed.keyPoints } : {}),
    ...(parsed.decisions?.length ? { decisions: parsed.decisions } : {}),
    ...(parsed.actionItems?.length ? { actionItems: parsed.actionItems } : {}),
    ...(parsed.unresolved?.length ? { unresolved: parsed.unresolved } : {}),
    messageCount: chronological.length,
  };
};

/** Summarizes the latest 50 messages of a channel via Groq. */
export const summarizeChannel = async (channel) => {
  const newestFirst = await messageRepository.findByScope({
    channelId: channel._id,
    threadId: null,
    limit: MESSAGE_LIMIT,
  });
  return generateSummary(newestFirst, "Channel transcript");
};

/** Summarizes the latest 50 messages of a direct-message conversation via Groq. */
export const summarizeDm = async (dm) => {
  const newestFirst = await dmRepository.findMessages({
    dmId: dm._id,
    limit: MESSAGE_LIMIT,
  });
  return generateSummary(newestFirst, "Direct message transcript");
};
