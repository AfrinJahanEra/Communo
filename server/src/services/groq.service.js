import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_TIMEOUT_MS = 30_000;
const MAX_COMPLETION_TOKENS = 2048;

const assertConfigured = () => {
  if (!env.GROQ_API_KEY) {
    throw new ApiError(
      503,
      "The AI assistant is not configured on this server yet. Add a Groq API key to enable it."
    );
  }
};

/**
 * Sends an OpenAI-compatible chat completion request to Groq.
 * The API key never leaves this module. Non-streaming v1 (SSE later).
 *
 * @param {Array<{role: string, content: string}>} messages
 * @returns {{ content: string, tokens: { prompt: number, completion: number } }}
 */
export const chatCompletion = async (messages) => {
  assertConfigured();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);
  let response;
  let body;
  try {
    response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        messages,
        max_tokens: MAX_COMPLETION_TOKENS,
        temperature: 0.6,
      }),
      signal: controller.signal,
    });
    body = await response.json().catch(() => ({}));
  } catch (err) {
    logger.error(`Groq request failed: ${err.message}`);
    throw new ApiError(
      503,
      err.name === "AbortError"
        ? "The AI assistant timed out, please try again"
        : "The AI assistant is unreachable, please try again later"
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401 || response.status === 403) {
    logger.error(`Groq rejected credentials: ${JSON.stringify(body?.error ?? body)}`);
    throw new ApiError(503, "The AI assistant is misconfigured on this server");
  }
  if (response.status === 429) {
    throw ApiError.tooManyRequests("The AI assistant is busy right now, try again in a moment");
  }
  if (response.status === 400) {
    logger.error(`Groq bad request: ${JSON.stringify(body?.error ?? body)}`);
    throw ApiError.badRequest("The AI assistant could not process this request");
  }
  if (!response.ok) {
    logger.error(`Groq error (${response.status}): ${JSON.stringify(body?.error ?? body)}`);
    throw new ApiError(503, "The AI assistant failed, please try again later");
  }

  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content) {
    logger.error(`Groq returned an empty completion: ${JSON.stringify(body)}`);
    throw new ApiError(503, "The AI assistant returned an empty response, please retry");
  }

  return {
    content,
    tokens: {
      prompt: body.usage?.prompt_tokens ?? 0,
      completion: body.usage?.completion_tokens ?? 0,
    },
  };
};
