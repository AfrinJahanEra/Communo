import { z } from "zod";
import { objectId } from "../validations/server.validation.js";
import * as serverRepository from "../repositories/server.repository.js";
import * as serverMemberRepository from "../repositories/serverMember.repository.js";
import * as workspaceService from "../services/workspace.service.js";
import * as executionService from "../services/execution.service.js";
import * as runnerService from "../services/runner.service.js";
import logger from "../utils/logger.js";
import { safe } from "./ack.js";

const runIdSchema = z.string().regex(/^run-[A-Za-z0-9-]{6,64}$/);

const startSchema = z
  .object({
    serverId: objectId("server id"),
    runId: runIdSchema,
    fileId: objectId("file id").optional(),
    source: z.string().max(200_000).optional(),
    language: z.string().max(40).optional(),
    // Lines typed in the terminal before pressing Run (delivered at start)
    queuedStdin: z.array(z.string().max(4000)).max(500).default([]),
  })
  .refine((d) => d.fileId || (d.source !== undefined && d.language), {
    message: "fileId or source+language is required",
  });

/**
 * Interactive code runs (VS Code style): the program is spawned on the
 * server, output streams back over `run:output`, and terminal lines typed
 * by the user are written to its stdin via `run:stdin`. Languages without a
 * local runtime fall back to the JDoodle cloud batch runner, using the
 * queued lines as stdin.
 *
 * Runs are personal: events go only to the socket that started them.
 */
export const registerRunnerHandlers = (io, socket) => {
  const user = socket.user;
  let active = null; // { runId, handle }

  const emitOutput = (runId, stream, data) => socket.emit("run:output", { runId, stream, data });

  const stopActive = () => {
    if (!active) return;
    active.handle.stop();
    active = null;
  };

  socket.on(
    "run:start",
    safe(async (payload) => {
      const data = startSchema.parse(payload);

      const server = await serverRepository.findById(data.serverId);
      if (!server) throw new Error("Server not found");
      const membership = await serverMemberRepository.findMembership(data.serverId, user._id);
      if (!membership) throw new Error("You are not a member of this server");

      let { source, language } = data;
      if (data.fileId) {
        const workspace = await workspaceService.getOrCreateWorkspace(server, user._id);
        const doc = await workspaceService.getFileWithContent(workspace, data.fileId);
        source = doc.content;
        language = doc.file.language;
      }

      stopActive(); // one live run per socket
      const { runId } = data;
      const queued = data.queuedStdin;

      if (await runnerService.isLocallySupported(language)) {
        const handle = await runnerService.start(
          { language, source },
          {
            onStdout: (text) => emitOutput(runId, "stdout", text),
            onStderr: (text) => emitOutput(runId, "stderr", text),
            onSystem: (text) => emitOutput(runId, "system", text),
            onEnd: (info) => {
              if (active?.runId === runId) active = null;
              socket.emit("run:end", { runId, mode: "interactive", ...info });
            },
          }
        );
        active = { runId, handle };
        queued.forEach((line) => handle.write(line));
        return { runId, mode: "interactive" };
      }

      // No local runtime → cloud batch run; ack now, results stream as events
      emitOutput(
        runId,
        "system",
        `No local ${language} runtime on this server — running in the cloud (batch mode); queued lines were sent as stdin.\n`
      );
      executionService
        .execute({ language, source, stdin: queued.length ? `${queued.join("\n")}\n` : "" })
        .then((result) => {
          if (result.output) {
            emitOutput(runId, result.status === "success" ? "stdout" : "stderr", result.output);
          }
          socket.emit("run:end", {
            runId,
            mode: "batch",
            status: result.status,
            exitCode: null,
            ms: null,
            cpuTime: result.cpuTime,
            memory: result.memory,
          });
        })
        .catch((err) => {
          emitOutput(runId, "system", `Cloud run failed: ${err.message}\n`);
          socket.emit("run:end", {
            runId,
            mode: "batch",
            status: "runtime_error",
            exitCode: null,
            ms: null,
          });
        });
      return { runId, mode: "batch" };
    })
  );

  socket.on("run:stdin", (payload) => {
    const { runId, data } = payload || {};
    if (!active || active.runId !== runId) return;
    if (typeof data === "string" && data.length <= 4000) active.handle.write(data);
  });

  socket.on("run:stop", (payload) => {
    if (!active || active.runId !== payload?.runId) return;
    stopActive();
  });

  socket.on("disconnect", () => stopActive());

  logger.debug(`runner handlers registered for ${user.username} (${socket.id})`);
};
