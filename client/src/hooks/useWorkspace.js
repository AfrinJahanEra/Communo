import { useCallback, useEffect, useRef, useState } from "react";
import { apiMessage } from "../lib/api";
import { emitAck } from "../lib/socket";
import { idOf } from "../lib/utils";
import { useSocket, useSocketEvent } from "./useSocket";
import * as workspaceService from "../services/workspaceService";

/**
 * Live state for one server's collaborative workspace: joins the Socket.IO
 * workspace room, keeps the file tree + participant presence in sync and
 * exposes file actions (open/create/rename/delete/save). Editor-level doc
 * sync (ops, cursors) lives in components/ide/CodeEditor.
 */
export const useWorkspace = (serverId) => {
  const { ready } = useSocket();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workspace, setWorkspace] = useState(null);
  const [files, setFiles] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [languages, setLanguages] = useState({});
  // { file: {_id,path,language}, content, version, participants } from file:open
  const [openDoc, setOpenDoc] = useState(null);
  const [opening, setOpening] = useState(false);

  const workspaceId = workspace?._id ? String(workspace._id) : null;
  // Survives reconnects so the same file reopens after a socket drop.
  const activeFileIdRef = useRef(null);

  const matchesWorkspace = useCallback(
    (payload) => workspaceId && idOf(payload.workspaceId) === workspaceId,
    [workspaceId]
  );

  const openFile = useCallback(async (fileId) => {
    setOpening(true);
    const ack = await emitAck("file:open", { fileId });
    setOpening(false);
    if (!ack.success) throw new Error(ack.message || "Could not open the file");
    activeFileIdRef.current = String(ack.file._id);
    setOpenDoc({
      file: ack.file,
      content: ack.content,
      version: ack.version,
      // Remount key: same file re-opened (reconnect) still resets the editor
      nonce: Date.now(),
    });
    return ack;
  }, []);

  // ---- join / reconnect ----
  const lastServerIdRef = useRef(serverId);
  useEffect(() => {
    if (!serverId || !ready) return undefined;
    // Server switch: never carry the previous server's open file across
    if (lastServerIdRef.current !== serverId) {
      lastServerIdRef.current = serverId;
      activeFileIdRef.current = null;
    }
    let alive = true;

    (async () => {
      try {
        // REST first: ships the language registry alongside the tree
        const initial = await workspaceService.getWorkspace(serverId);
        if (!alive) return;
        setLanguages(initial.languages || {});

        const ack = await emitAck("workspace:join", { serverId });
        if (!alive) return;
        if (!ack.success) {
          setError(ack.message || "Could not join the workspace");
          setLoading(false);
          return;
        }
        setWorkspace(ack.workspace);
        setFiles(ack.files || []);
        setParticipants(ack.participants || []);
        setError("");
        setLoading(false);

        // Socket dropped mid-session: transparently reopen the active file
        if (activeFileIdRef.current) {
          const reopened = await emitAck("file:open", { fileId: activeFileIdRef.current });
          if (alive && reopened.success) {
            setOpenDoc({
              file: reopened.file,
              content: reopened.content,
              version: reopened.version,
              nonce: Date.now(),
            });
          } else if (alive) {
            activeFileIdRef.current = null;
            setOpenDoc(null);
          }
        }
      } catch (err) {
        if (!alive) return;
        setError(apiMessage(err, "Could not load the workspace"));
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
      emitAck("workspace:leave", {});
    };
  }, [serverId, ready]);

  // Reset synchronously when switching servers so stale trees never flash.
  const [prevServerId, setPrevServerId] = useState(serverId);
  if (serverId !== prevServerId) {
    setPrevServerId(serverId);
    setLoading(true);
    setError("");
    setWorkspace(null);
    setFiles([]);
    setParticipants([]);
    setOpenDoc(null);
  }

  // ---- presence events ----
  useSocketEvent(
    "workspace:user-joined",
    (payload) => {
      if (!matchesWorkspace(payload)) return;
      setParticipants((prev) => {
        const without = prev.filter((p) => idOf(p.userId) !== idOf(payload.participant.userId));
        return [...without, payload.participant];
      });
    },
    [matchesWorkspace]
  );

  useSocketEvent(
    "workspace:user-left",
    (payload) => {
      if (!matchesWorkspace(payload)) return;
      setParticipants((prev) => prev.filter((p) => idOf(p.userId) !== idOf(payload.userId)));
    },
    [matchesWorkspace]
  );

  useSocketEvent(
    "file:user-opened",
    (payload) => {
      if (!matchesWorkspace(payload)) return;
      setParticipants((prev) =>
        prev.map((p) =>
          idOf(p.userId) === idOf(payload.userId)
            ? { ...p, activeFileId: idOf(payload.fileId) }
            : p
        )
      );
    },
    [matchesWorkspace]
  );

  useSocketEvent(
    "file:user-closed",
    (payload) => {
      if (!matchesWorkspace(payload)) return;
      setParticipants((prev) =>
        prev.map((p) =>
          idOf(p.userId) === idOf(payload.userId) && idOf(p.activeFileId) === idOf(payload.fileId)
            ? { ...p, activeFileId: null }
            : p
        )
      );
    },
    [matchesWorkspace]
  );

  // ---- file tree events (reach editor participants + server subscribers) ----
  useSocketEvent(
    "file:created",
    (payload) => {
      if (!matchesWorkspace(payload)) return;
      setFiles((prev) =>
        prev.some((f) => idOf(f._id) === idOf(payload.file._id)) ? prev : [...prev, payload.file]
      );
    },
    [matchesWorkspace]
  );

  useSocketEvent(
    "file:renamed",
    (payload) => {
      if (!matchesWorkspace(payload)) return;
      setFiles((prev) =>
        prev.map((f) => (idOf(f._id) === idOf(payload.file._id) ? payload.file : f))
      );
      setOpenDoc((prev) =>
        prev && idOf(prev.file._id) === idOf(payload.file._id)
          ? { ...prev, file: { ...prev.file, path: payload.file.path, language: payload.file.language } }
          : prev
      );
    },
    [matchesWorkspace]
  );

  useSocketEvent(
    "file:deleted",
    (payload) => {
      if (!matchesWorkspace(payload)) return;
      setFiles((prev) => prev.filter((f) => idOf(f._id) !== idOf(payload.fileId)));
      if (activeFileIdRef.current === idOf(payload.fileId)) {
        activeFileIdRef.current = null;
        setOpenDoc(null);
      }
    },
    [matchesWorkspace]
  );

  useSocketEvent(
    "file:saved",
    (payload) => {
      if (!matchesWorkspace(payload)) return;
      setFiles((prev) =>
        prev.map((f) =>
          idOf(f._id) === idOf(payload.fileId) ? { ...f, version: payload.version } : f
        )
      );
    },
    [matchesWorkspace]
  );

  // ---- actions ----
  const closeFile = useCallback(async () => {
    activeFileIdRef.current = null;
    setOpenDoc(null);
    await emitAck("file:close", {});
  }, []);

  const createFile = useCallback(
    async (path, content = "") => {
      const file = await workspaceService.createFile(serverId, { path, content });
      // The socket event also adds it; insert defensively for instant feedback
      setFiles((prev) =>
        prev.some((f) => idOf(f._id) === idOf(file._id)) ? prev : [...prev, file]
      );
      return file;
    },
    [serverId]
  );

  const renameFile = useCallback(
    (fileId, path) => workspaceService.renameFile(serverId, fileId, path),
    [serverId]
  );

  const deleteFile = useCallback(
    (fileId) => workspaceService.deleteFile(serverId, fileId),
    [serverId]
  );

  const saveActiveFile = useCallback(async () => {
    if (!activeFileIdRef.current) return null;
    const ack = await emitAck("file:save", { fileId: activeFileIdRef.current });
    if (!ack.success) throw new Error(ack.message || "Save failed");
    return ack;
  }, []);

  return {
    loading,
    error,
    ready,
    workspace,
    files,
    participants,
    languages,
    openDoc,
    opening,
    openFile,
    closeFile,
    createFile,
    renameFile,
    deleteFile,
    saveActiveFile,
  };
};
