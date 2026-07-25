import * as workspaceFileRepository from "../repositories/workspaceFile.repository.js";
import { MAX_FILE_CONTENT } from "../models/WorkspaceFile.js";
import logger from "../utils/logger.js";

/**
 * Authoritative in-memory document store for the collaborative editor.
 *
 * Sync model: Node's single-threaded event loop serializes edit batches per
 * file. Each accepted batch bumps `version`; clients editing against a stale
 * baseVersion get a full resync instead of a merge. Documents are flushed to
 * MongoDB on a debounce (auto-save) and evicted when the last editor closes
 * the file. For horizontal scaling this store would move behind Redis.
 */

const IDLE_FLUSH_MS = 2_000; // save 2s after the last keystroke
const MAX_FLUSH_MS = 10_000; // ...but never wait longer than 10s

// fileId -> { content, version, dirty, lastEditor, idleTimer, maxTimer }
const docs = new Map();

const clearTimers = (doc) => {
  clearTimeout(doc.idleTimer);
  clearTimeout(doc.maxTimer);
  doc.idleTimer = null;
  doc.maxTimer = null;
};

/** Persists a dirty document; safe to call at any time. */
export const flush = async (fileId) => {
  const key = fileId.toString();
  const doc = docs.get(key);
  if (!doc || !doc.dirty) return doc ?? null;
  clearTimers(doc);
  doc.dirty = false;
  try {
    await workspaceFileRepository.updateContent(key, {
      content: doc.content,
      version: doc.version,
      updatedBy: doc.lastEditor,
    });
  } catch (err) {
    doc.dirty = true; // retry on the next edit/flush
    logger.error(`workspace auto-save failed for file ${key}: ${err.message}`);
  }
  return doc;
};

const scheduleFlush = (key, doc) => {
  clearTimeout(doc.idleTimer);
  doc.idleTimer = setTimeout(() => flush(key), IDLE_FLUSH_MS);
  if (!doc.maxTimer) {
    doc.maxTimer = setTimeout(() => flush(key), MAX_FLUSH_MS);
  }
};

/** Loads a file into memory (no-op when already open) and returns the doc. */
export const open = async (fileId) => {
  const key = fileId.toString();
  let doc = docs.get(key);
  if (!doc) {
    const file = await workspaceFileRepository.findById(key);
    if (!file) return null;
    doc = {
      content: file.content,
      version: file.version,
      dirty: false,
      lastEditor: file.updatedBy ?? file.createdBy,
      idleTimer: null,
      maxTimer: null,
    };
    docs.set(key, doc);
  }
  return doc;
};

export const get = (fileId) => docs.get(fileId.toString()) ?? null;

/**
 * Applies one edit batch. Returns:
 *  - { stale: true, content, version }  when baseVersion no longer matches
 *  - { version }                        when the ops were accepted
 * Ops use Monaco offsets against the base text, so they are applied in
 * descending rangeOffset order (later edits first keep earlier offsets valid).
 */
export const applyOps = (fileId, baseVersion, ops, editorUserId) => {
  const doc = docs.get(fileId.toString());
  if (!doc) throw new Error("Open the file before editing");
  if (doc.version !== baseVersion) {
    return { stale: true, content: doc.content, version: doc.version };
  }

  let next = doc.content;
  const ordered = [...ops].sort((a, b) => b.rangeOffset - a.rangeOffset);
  for (const op of ordered) {
    if (op.rangeOffset > next.length || op.rangeOffset + op.rangeLength > next.length) {
      throw new Error("Edit is out of bounds for the current document");
    }
    next =
      next.slice(0, op.rangeOffset) + op.text + next.slice(op.rangeOffset + op.rangeLength);
  }
  if (next.length > MAX_FILE_CONTENT) {
    throw new Error("File content exceeds the 200KB limit");
  }

  doc.content = next;
  doc.version += 1;
  doc.dirty = true;
  doc.lastEditor = editorUserId;
  scheduleFlush(fileId.toString(), doc);
  return { version: doc.version };
};

/** Flush + evict; called when the last editor closes the file. */
export const close = async (fileId) => {
  const key = fileId.toString();
  const doc = docs.get(key);
  if (!doc) return;
  await flush(key);
  clearTimers(doc);
  docs.delete(key);
};

/** Evict without saving (file was deleted). */
export const drop = (fileId) => {
  const key = fileId.toString();
  const doc = docs.get(key);
  if (doc) clearTimers(doc);
  docs.delete(key);
};

/**
 * Authoritative read used by REST (download / get content): prefers the live
 * in-memory doc over the possibly-behind persisted copy.
 */
export const currentContent = (file) => {
  const doc = docs.get(file._id.toString());
  return doc
    ? { content: doc.content, version: doc.version }
    : { content: file.content, version: file.version };
};
