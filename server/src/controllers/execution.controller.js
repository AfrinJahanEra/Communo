import asyncHandler from "../utils/asyncHandler.js";
import { sendOk } from "../utils/response.js";
import * as workspaceService from "../services/workspace.service.js";
import * as executionService from "../services/execution.service.js";

/**
 * Runs code through JDoodle. Two input shapes:
 *  - { fileId, stdin? }               -> run a workspace file (live content)
 *  - { source, language, stdin? }     -> run an ad-hoc snippet
 */
export const executeCode = asyncHandler(async (req, res) => {
  const { fileId, stdin } = req.body;
  let { source, language } = req.body;

  if (fileId) {
    const workspace = await workspaceService.getOrCreateWorkspace(req.server, req.user._id);
    const { file, content } = await workspaceService.getFileWithContent(workspace, fileId);
    source = content;
    language = file.language;
  }

  const result = await executionService.execute({ language, source, stdin });
  return sendOk(res, "Execution finished", { result });
});
