import { z } from "zod";
import { objectId } from "./server.validation.js";
import { EXECUTABLE_LANGUAGES } from "../constants/languages.js";
import { MAX_FILE_CONTENT } from "../models/WorkspaceFile.js";

/**
 * File paths encode the folder structure: "src/utils/math.py".
 * Segments allow letters, digits, dot, dash, underscore and spaces;
 * no leading/trailing slashes, no empty segments, no traversal.
 */
const pathSegment = /^[A-Za-z0-9][A-Za-z0-9._\- ]*$/;

export const filePathField = z
  .string()
  .trim()
  .min(1, "File path is required")
  .max(200, "File path cannot exceed 200 characters")
  .refine(
    (value) =>
      value.split("/").every((segment) => pathSegment.test(segment) && segment !== ".." ),
    "Invalid file path: use letters, numbers, dots, dashes and '/' for folders"
  );

export const fileIdParamSchema = z.object({
  serverId: objectId("server id"),
  fileId: objectId("file id"),
});

export const createFileSchema = z.object({
  path: filePathField,
  content: z.string().max(MAX_FILE_CONTENT, "Content exceeds the 200KB limit").optional().default(""),
});

export const renameFileSchema = z.object({
  path: filePathField,
});

export const createFolderSchema = z.object({
  path: filePathField,
});

/** Folders are identified by path (they may be purely virtual), not an id. */
export const renameFolderSchema = z.object({
  from: filePathField,
  to: filePathField,
});

export const folderPathQuerySchema = z.object({
  path: filePathField,
});

export const executeSchema = z
  .object({
    fileId: objectId("file id").optional(),
    language: z.enum(EXECUTABLE_LANGUAGES).optional(),
    source: z.string().max(MAX_FILE_CONTENT, "Source exceeds the 200KB limit").optional(),
    stdin: z.string().max(10_000, "stdin cannot exceed 10KB").optional().default(""),
  })
  .refine((data) => data.fileId || (data.source !== undefined && data.language), {
    message: "Provide either fileId, or source together with language",
  });

// ---------- socket payloads ----------

/** One Monaco content change, offset-addressed against baseVersion. */
export const editOpSchema = z.object({
  rangeOffset: z.number().int().min(0),
  rangeLength: z.number().int().min(0),
  text: z.string().max(MAX_FILE_CONTENT),
});

export const codeEditSchema = z.object({
  fileId: objectId("file id"),
  baseVersion: z.number().int().min(1),
  ops: z.array(editOpSchema).min(1).max(50),
});

export const cursorMoveSchema = z.object({
  fileId: objectId("file id"),
  // Monaco position/selection objects are relayed as-is to peers
  position: z.object({
    lineNumber: z.number().int().min(1),
    column: z.number().int().min(1),
  }),
  selection: z
    .object({
      startLineNumber: z.number().int().min(1),
      startColumn: z.number().int().min(1),
      endLineNumber: z.number().int().min(1),
      endColumn: z.number().int().min(1),
    })
    .optional(),
});
