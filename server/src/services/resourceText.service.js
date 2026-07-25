import { PDFParse } from "pdf-parse";
import logger from "../utils/logger.js";
import { TEXT_STATUS } from "../models/Resource.js";

/** Keep AI context storage bounded; enough for ~40 pages of dense notes. */
const MAX_TEXT_CHARS = 100_000;

const clean = (text) => text.replace(/\u0000/g, "").trim().slice(0, MAX_TEXT_CHARS);

/**
 * Extracts plain text from an uploaded buffer for AI context.
 * Returns { textStatus, textContent } and never throws — a failed
 * extraction must not fail the upload itself.
 *
 * Future expansion (semantic search): chunk `textContent` and index
 * embeddings; this function stays the single entry point.
 */
export const extractText = async ({ buffer, extension }) => {
  try {
    if (extension === ".pdf") {
      // pdf-parse v2: class API; pdfjs wants a Uint8Array, not a Buffer
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const parsed = await parser.getText();
        return { textStatus: TEXT_STATUS.DONE, textContent: clean(parsed.text ?? "") };
      } finally {
        await parser.destroy();
      }
    }
    if (extension === ".txt" || extension === ".md") {
      return { textStatus: TEXT_STATUS.DONE, textContent: clean(buffer.toString("utf8")) };
    }
    // docx/pptx/images: no extractor wired yet — metadata-only resources
    return { textStatus: TEXT_STATUS.NONE, textContent: "" };
  } catch (err) {
    logger.warn(`resource text extraction failed: ${err.message}`);
    return { textStatus: TEXT_STATUS.FAILED, textContent: "" };
  }
};
