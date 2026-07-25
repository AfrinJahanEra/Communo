import { objectId } from "../validations/server.validation.js";
import {
  codeEditSchema,
  cursorMoveSchema,
} from "../validations/workspace.validation.js";
import * as serverRepository from "../repositories/server.repository.js";
import * as serverMemberRepository from "../repositories/serverMember.repository.js";
import * as workspaceRepository from "../repositories/workspace.repository.js";
import * as workspaceService from "../services/workspace.service.js";
import { safe } from "./ack.js";
import { workspaceRoom, workspaceFileRoom } from "./emitters.js";
import * as workspaceState from "./workspaceState.js";
import * as documentStore from "./documentStore.js";

const idSchema = objectId("id");

/** Public projection of a participant (socketId stays server-side). */
const toPublic = ({ userId, username, displayName, avatar, color, activeFileId, joinedAt }) => ({
  userId,
  username,
  displayName,
  avatar,
  color,
  activeFileId,
  joinedAt,
});

/** Verifies membership and resolves the server's workspace for a socket. */
const loadWorkspaceContext = async (serverId, userId) => {
  const server = await serverRepository.findById(serverId);
  if (!server) throw new Error("Server not found");
  const membership = await serverMemberRepository.findMembership(serverId, userId);
  if (!membership) throw new Error("You are not a member of this server");
  const workspace = await workspaceService.getOrCreateWorkspace(server, userId);
  return { server, workspace };
};

export const registerWorkspaceHandlers = (io, socket) => {
  const user = socket.user;

  /** The workspace the socket currently collaborates in (or throws). */
  const requireEntry = () => {
    const entry = workspaceState.getBySocket(socket.id);
    if (!entry) throw new Error("Join the workspace first");
    return entry;
  };

  /** Releases the currently open file: presence, room, doc eviction. */
  const closeActiveFile = async (entry) => {
    const participant = workspaceState.getParticipant(entry.workspaceId, entry.userId);
    const fileId = participant?.activeFileId;
    if (!fileId) return;
    workspaceState.setActiveFile(socket.id, null);
    await socket.leave(workspaceFileRoom(fileId));
    io.to(workspaceRoom(entry.workspaceId)).emit("file:user-closed", {
      workspaceId: entry.workspaceId,
      fileId,
      userId: entry.userId,
    });
    // Last viewer gone: persist and evict the in-memory doc
    if (workspaceState.isFileIdle(entry.workspaceId, fileId)) {
      await documentStore.close(fileId);
    }
  };

  /** Full exit used by workspace:leave and disconnect. */
  const leaveWorkspace = async () => {
    const entry = workspaceState.getBySocket(socket.id);
    if (!entry) return null;
    await closeActiveFile(entry);
    const left = workspaceState.leaveBySocket(socket.id);
    if (!left) return null;
    await socket.leave(workspaceRoom(left.workspaceId));
    io.to(workspaceRoom(left.workspaceId)).emit("workspace:user-left", {
      workspaceId: left.workspaceId,
      userId: left.userId,
    });
    return left;
  };

  socket.on(
    "workspace:join",
    safe(async ({ serverId }) => {
      idSchema.parse(serverId);
      const { workspace } = await loadWorkspaceContext(serverId, user._id);

      const existing = workspaceState.getBySocket(socket.id);
      if (existing && existing.workspaceId !== workspace._id.toString()) {
        await leaveWorkspace(); // one workspace per socket: auto-switch
      }
      if (!workspaceState.getParticipant(workspace._id, user._id)) {
        const participant = workspaceState.join(workspace._id, user, socket.id);
        socket.to(workspaceRoom(workspace._id)).emit("workspace:user-joined", {
          workspaceId: workspace._id,
          participant: toPublic(participant),
        });
      }
      await socket.join(workspaceRoom(workspace._id));

      const files = await workspaceService.listFiles(workspace._id);
      return {
        workspace,
        files,
        participants: workspaceState.getParticipants(workspace._id).map(toPublic),
      };
    })
  );

  socket.on(
    "workspace:leave",
    safe(async () => {
      const left = await leaveWorkspace();
      if (!left) throw new Error("You are not in a workspace");
      return { workspaceId: left.workspaceId };
    })
  );

  socket.on(
    "file:open",
    safe(async ({ fileId }) => {
      idSchema.parse(fileId);
      const entry = requireEntry();
      const workspace = { _id: entry.workspaceId }; // scope check via service
      const wsDoc = await workspaceService.getFileInWorkspace(workspace, fileId);

      await closeActiveFile(entry); // one open file per socket
      await documentStore.open(wsDoc._id);
      workspaceState.setActiveFile(socket.id, wsDoc._id);
      await socket.join(workspaceFileRoom(wsDoc._id));

      io.to(workspaceRoom(entry.workspaceId)).emit("file:user-opened", {
        workspaceId: entry.workspaceId,
        fileId: wsDoc._id,
        userId: entry.userId,
      });

      const { content, version } = documentStore.currentContent(wsDoc);
      return {
        file: {
          _id: wsDoc._id,
          path: wsDoc.path,
          language: wsDoc.language,
        },
        content,
        version,
        participants: workspaceState
          .getFileParticipants(entry.workspaceId, wsDoc._id)
          .map(toPublic),
      };
    })
  );

  socket.on(
    "file:close",
    safe(async () => {
      const entry = requireEntry();
      await closeActiveFile(entry);
      return {};
    })
  );

  socket.on(
    "code:edit",
    safe(async (payload) => {
      const { fileId, baseVersion, ops } = codeEditSchema.parse(payload);
      const entry = requireEntry();
      if (!socket.rooms.has(workspaceFileRoom(fileId))) {
        throw new Error("Open the file before editing");
      }
      const result = documentStore.applyOps(fileId, baseVersion, ops, user._id);
      if (result.stale) {
        // Client rebases on the authoritative content instead of merging
        return { resync: true, content: result.content, version: result.version };
      }
      socket.to(workspaceFileRoom(fileId)).emit("code:edited", {
        fileId,
        ops,
        version: result.version,
        userId: entry.userId,
      });
      return { version: result.version };
    })
  );

  socket.on(
    "cursor:move",
    safe(async (payload) => {
      const { fileId, position, selection } = cursorMoveSchema.parse(payload);
      const entry = requireEntry();
      const participant = workspaceState.getParticipant(entry.workspaceId, entry.userId);
      if (participant?.activeFileId !== fileId) {
        throw new Error("Open the file before moving the cursor");
      }
      // volatile: dropped frames are fine for cursor ghosts
      socket.volatile.to(workspaceFileRoom(fileId)).emit("cursor:update", {
        fileId,
        userId: entry.userId,
        username: user.username,
        color: participant.color,
        position,
        selection: selection ?? null,
      });
      return {};
    })
  );

  socket.on(
    "workspace:typing",
    safe(async ({ fileId, isTyping }) => {
      idSchema.parse(fileId);
      const entry = requireEntry();
      if (!socket.rooms.has(workspaceFileRoom(fileId))) {
        throw new Error("Open the file before typing");
      }
      socket.to(workspaceFileRoom(fileId)).emit("workspace:typing", {
        fileId,
        userId: entry.userId,
        username: user.username,
        isTyping: Boolean(isTyping),
      });
      return {};
    })
  );

  socket.on(
    "file:save",
    safe(async ({ fileId }) => {
      idSchema.parse(fileId);
      const entry = requireEntry();
      // Full doc needed: save events also fan out to the server room
      const workspace = await workspaceRepository.findById(entry.workspaceId);
      if (!workspace) throw new Error("Workspace not found");
      const { version } = await workspaceService.saveFile(workspace, fileId, user._id);
      return { fileId, version };
    })
  );

  // Socket dropped (tab closed, network loss): free presence + flush docs
  socket.on("disconnect", () => {
    leaveWorkspace().catch(() => {});
  });
};
