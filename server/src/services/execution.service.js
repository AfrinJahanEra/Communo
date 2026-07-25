import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";
import { LANGUAGES } from "../constants/languages.js";

const JDOODLE_URL = "https://api.jdoodle.com/v1/execute";
const EXECUTE_TIMEOUT_MS = 15_000;

export const EXECUTION_STATUS = Object.freeze({
  SUCCESS: "success",
  COMPILE_ERROR: "compile_error",
  RUNTIME_ERROR: "runtime_error",
  LIMIT_REACHED: "limit_reached",
});

const assertConfigured = () => {
  if (!env.JDOODLE_CLIENT_ID || !env.JDOODLE_CLIENT_SECRET) {
    throw new ApiError(
      503,
      "Code execution is not configured on this server yet. Add JDoodle credentials to enable it."
    );
  }
};

/**
 * Best-effort status classification from the JDoodle response:
 *  - isCompiled === false, or missing cpuTime -> compiler rejected the code
 *  - isExecutionSuccess === false             -> the program crashed
 * Heuristics degrade to "success" (with raw output) when JDoodle omits flags.
 */
const classify = (body) => {
  if (body.isCompiled === false) return EXECUTION_STATUS.COMPILE_ERROR;
  if (body.isExecutionSuccess === false) return EXECUTION_STATUS.RUNTIME_ERROR;
  if (body.cpuTime == null && body.memory == null) return EXECUTION_STATUS.COMPILE_ERROR;
  return EXECUTION_STATUS.SUCCESS;
};

/**
 * Runs code through the JDoodle API. Credentials live only in env — every
 * execution request is proxied through this service.
 */
export const execute = async ({ language, source, stdin = "" }) => {
  assertConfigured();

  const config = LANGUAGES[language]?.jdoodle;
  if (!config) {
    throw ApiError.badRequest(`Execution is not supported for ${language}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXECUTE_TIMEOUT_MS);
  let response;
  let body;
  try {
    response = await fetch(JDOODLE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: env.JDOODLE_CLIENT_ID,
        clientSecret: env.JDOODLE_CLIENT_SECRET,
        script: source,
        stdin,
        language: config.language,
        versionIndex: config.versionIndex,
      }),
      signal: controller.signal,
    });
    body = await response.json().catch(() => ({}));
  } catch (err) {
    logger.error(`JDoodle request failed: ${err.message}`);
    const timedOut = err.name === "AbortError";
    throw new ApiError(
      503,
      timedOut
        ? "Code execution timed out, please try again"
        : "Code execution service is unreachable, please try again later"
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 429) {
    return {
      status: EXECUTION_STATUS.LIMIT_REACHED,
      output: "Daily execution limit reached. Please try again tomorrow.",
      cpuTime: null,
      memory: null,
    };
  }
  if (response.status === 401 || response.status === 403) {
    logger.error(`JDoodle rejected credentials: ${JSON.stringify(body)}`);
    throw new ApiError(503, "Code execution is misconfigured on this server");
  }
  if (!response.ok || body.error) {
    logger.error(`JDoodle error (${response.status}): ${JSON.stringify(body)}`);
    throw new ApiError(503, "Code execution failed, please try again later");
  }

  return {
    status: classify(body),
    output: body.output ?? "",
    cpuTime: body.cpuTime ?? null,
    memory: body.memory ?? null,
  };
};
