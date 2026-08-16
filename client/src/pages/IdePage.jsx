import { useCallback, useRef, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import {
  Check,
  CloudOff,
  Code2,
  Download,
  FileCode2,
  FolderTree,
  Map as MapIcon,
  Menu as MenuIcon,
  Play,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import { CodeEditor } from "../components/ide/CodeEditor";
import { CollaboratorStack } from "../components/ide/CollaboratorStack";
import { ConsolePanel } from "../components/ide/ConsolePanel";
import { FileExplorer } from "../components/ide/FileExplorer";
import { FilePathModal } from "../components/ide/FilePathModal";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Select } from "../components/ui/Input";
import { LoadingScreen, Spinner } from "../components/ui/Spinner";
import { useSocketEvent } from "../hooks/useSocket";
import { useToast } from "../hooks/useToast";
import { useWorkspace } from "../hooks/useWorkspace";
import { apiMessage } from "../lib/api";
import { cn, idOf, saveBlob } from "../lib/utils";
import * as workspaceService from "../services/workspaceService";

/**
 * Collaborative IDE for one server: file explorer + Monaco realtime editor
 * + JDoodle run console. All state flows through useWorkspace (Socket.IO)
 * and the workspace REST API — see components/ide/CodeEditor for doc sync.
 */

const SYNC_META = {
  synced: { label: "Synced", icon: Check, className: "text-status-online" },
  syncing: { label: "Syncing…", icon: RefreshCw, className: "text-lav-600" },
  resynced: { label: "Resynced", icon: RefreshCw, className: "text-status-idle" },
};

const IdePage = () => {
  const { serverId } = useParams();
  const { openSidebar } = useOutletContext();
  const { toast } = useToast();

  const ws = useWorkspace(serverId);
  const editorApiRef = useRef(null);

  const [explorerOpen, setExplorerOpen] = useState(false);
  // { mode: "create" | "rename" | "create-folder" | "rename-folder", file?, path? }
  const [modal, setModal] = useState(null);
  const [minimap, setMinimap] = useState(false);

  // Per-file editor telemetry
  const [syncState, setSyncState] = useState("synced");
  const [version, setVersion] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [runLangOverride, setRunLangOverride] = useState(null);

  // Execution console
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [execError, setExecError] = useState("");

  const [saving, setSaving] = useState(false);
  const [typers, setTypers] = useState({}); // userId -> username

  const openDoc = ws.openDoc;
  const activeFileId = openDoc ? idOf(openDoc.file._id) : null;

  // Reset per-file telemetry synchronously when the open doc changes
  const docKey = openDoc ? `${activeFileId}:${openDoc.nonce}` : null;
  const [prevDocKey, setPrevDocKey] = useState(docKey);
  if (docKey !== prevDocKey) {
    setPrevDocKey(docKey);
    setSyncState("synced");
    setVersion(openDoc?.version ?? null);
    setCursor(null);
    setRunLangOverride(null);
    setTypers({});
  }

  useSocketEvent(
    "workspace:typing",
    (payload) => {
      if (!activeFileId || idOf(payload.fileId) !== activeFileId) return;
      setTypers((prev) => {
        const next = { ...prev };
        if (payload.isTyping) next[idOf(payload.userId)] = payload.username;
        else delete next[idOf(payload.userId)];
        return next;
      });
    },
    [activeFileId]
  );

  // ---- toolbar actions ----
  const fileLanguage = openDoc?.file.language || "plaintext";
  const executable = Object.entries(ws.languages).filter(([, meta]) => meta.jdoodle);
  const canRunFileLang = Boolean(ws.languages[fileLanguage]?.jdoodle);
  const runLang = runLangOverride || (canRunFileLang ? fileLanguage : executable[0]?.[0]);

  const runCode = async () => {
    if (!openDoc || !runLang) return;
    setRunning(true);
    setResult(null);
    setExecError("");
    setConsoleOpen(true);
    try {
      // Same language → run the server-side live doc; otherwise ship the
      // current buffer with the chosen language.
      const payload =
        runLang === fileLanguage
          ? { fileId: activeFileId, stdin }
          : { source: editorApiRef.current?.getValue() ?? "", language: runLang, stdin };
      setResult(await workspaceService.execute(serverId, payload));
    } catch (err) {
      setExecError(apiMessage(err, "Execution failed"));
    } finally {
      setRunning(false);
    }
  };

  const downloadFile = async () => {
    if (!openDoc) return;
    try {
      const blob = await workspaceService.downloadFile(serverId, activeFileId);
      saveBlob(blob, openDoc.file.path.split("/").pop());
    } catch (err) {
      toast({ type: "error", title: "Download failed", body: apiMessage(err) });
    }
  };

  const saveFile = useCallback(async () => {
    setSaving(true);
    try {
      const ack = await ws.saveActiveFile();
      if (ack) toast({ type: "success", title: "File saved", body: `Version ${ack.version}` });
    } catch (err) {
      toast({ type: "error", title: "Save failed", body: err.message });
    } finally {
      setSaving(false);
    }
  }, [ws.saveActiveFile, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- explorer actions ----
  const openFile = async (file) => {
    setExplorerOpen(false);
    try {
      await ws.openFile(idOf(file._id));
    } catch (err) {
      toast({ type: "error", title: "Could not open file", body: err.message });
    }
  };

  const deleteFile = async (file) => {
    if (!window.confirm(`Delete "${file.path}"? This cannot be undone.`)) return;
    try {
      await ws.deleteFile(idOf(file._id));
    } catch (err) {
      toast({ type: "error", title: "Delete failed", body: apiMessage(err) });
    }
  };

  const deleteFolder = async (path) => {
    if (!window.confirm(`Delete folder "${path}" and everything inside it? This cannot be undone.`)) {
      return;
    }
    try {
      await ws.deleteFolder(path);
    } catch (err) {
      toast({ type: "error", title: "Delete failed", body: apiMessage(err) });
    }
  };

  // ---- render ----
  if (ws.loading) return <LoadingScreen label="Opening workspace…" />;
  if (ws.error) {
    return (
      <EmptyState
        icon={CloudOff}
        title="Workspace unavailable"
        body={ws.error}
        className="h-full"
      />
    );
  }

  const syncMeta = SYNC_META[syncState] || SYNC_META.synced;
  const typingNames = Object.values(typers);

  const explorer = (
    <FileExplorer
      files={ws.files}
      participants={ws.participants}
      activeFileId={activeFileId}
      onOpen={openFile}
      onCreate={() => setModal({ mode: "create" })}
      onRename={(file) => setModal({ mode: "rename", file })}
      onDelete={deleteFile}
      onCreateFolder={() => setModal({ mode: "create-folder" })}
      onRenameFolder={(path) => setModal({ mode: "rename-folder", path })}
      onDeleteFolder={deleteFolder}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ---- toolbar ---- */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-cream-300 bg-cream-50/90 px-3 backdrop-blur">
        <button
          onClick={openSidebar}
          className="rounded-lg p-2 text-ink-500 transition hover:bg-cream-200 md:hidden"
          aria-label="Open sidebar"
        >
          <MenuIcon size={18} />
        </button>
        <button
          onClick={() => setExplorerOpen(true)}
          className="rounded-lg p-2 text-ink-500 transition hover:bg-cream-200 lg:hidden"
          aria-label="Open file explorer"
        >
          <FolderTree size={17} />
        </button>

        <Code2 size={18} className="hidden shrink-0 text-lav-600 sm:block" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold text-ink-900">
            {openDoc ? openDoc.file.path : "Collaborative IDE"}
          </h1>
          <p className="hidden truncate text-[11px] text-ink-300 sm:block">
            {openDoc
              ? ws.languages[fileLanguage]?.label || fileLanguage
              : "Code together in real time"}
          </p>
        </div>

        <CollaboratorStack participants={ws.participants} />

        {openDoc && (
          <>
            <Select
              value={runLang || ""}
              onChange={(e) => setRunLangOverride(e.target.value)}
              className="hidden w-auto rounded-lg py-1.5 pl-2.5 pr-7 text-xs sm:block"
              title="Run language"
              aria-label="Run language"
            >
              {executable.map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </Select>

            <Button size="sm" onClick={runCode} loading={running} disabled={!runLang}>
              <Play size={13} /> Run
            </Button>

            <button
              onClick={saveFile}
              disabled={saving}
              className="rounded-lg p-2 text-ink-500 transition hover:bg-cream-200 hover:text-ink-900 disabled:opacity-50"
              title="Save (Ctrl+S)"
            >
              {saving ? <Spinner size={15} /> : <Save size={16} />}
            </button>
            <button
              onClick={downloadFile}
              className="rounded-lg p-2 text-ink-500 transition hover:bg-cream-200 hover:text-ink-900"
              title="Download file"
            >
              <Download size={16} />
            </button>
            <button
              onClick={() => setMinimap((m) => !m)}
              className={cn(
                "hidden rounded-lg p-2 transition sm:block",
                minimap ? "bg-lav-100 text-lav-700" : "text-ink-500 hover:bg-cream-200 hover:text-ink-900"
              )}
              title="Toggle minimap"
            >
              <MapIcon size={16} />
            </button>
          </>
        )}
      </header>

      {/* ---- body ---- */}
      <div className="relative flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-cream-300 bg-cream-100/60 lg:block">
          {explorer}
        </aside>

        {/* mobile / tablet explorer drawer */}
        {explorerOpen && (
          <div className="absolute inset-0 z-20 flex lg:hidden">
            <div className="flex w-64 flex-col border-r border-cream-300 bg-cream-50 shadow-xl animate-slide-up">
              <div className="flex items-center justify-between border-b border-cream-300 px-3 py-2">
                <p className="text-xs font-bold text-ink-700">Explorer</p>
                <button
                  onClick={() => setExplorerOpen(false)}
                  className="rounded-lg p-1.5 text-ink-500 hover:bg-cream-200"
                  aria-label="Close explorer"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="min-h-0 flex-1">{explorer}</div>
            </div>
            <button
              className="flex-1 bg-ink-900/20"
              onClick={() => setExplorerOpen(false)}
              aria-label="Close explorer"
            />
          </div>
        )}

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            {openDoc ? (
              <CodeEditor
                key={docKey}
                fileId={activeFileId}
                language={ws.languages[fileLanguage]?.monacoId || "plaintext"}
                initialContent={openDoc.content}
                initialVersion={openDoc.version}
                minimap={minimap}
                onSyncStateChange={setSyncState}
                onVersionChange={setVersion}
                onCursorChange={setCursor}
                onSave={saveFile}
                apiRef={editorApiRef}
              />
            ) : (
              <EmptyState
                icon={FileCode2}
                title="No file open"
                body="Pick a file from the explorer or create a new one to start coding together."
                className="h-full"
                action={
                  <Button size="sm" variant="outline" onClick={() => setModal({ mode: "create" })}>
                    New file
                  </Button>
                }
              />
            )}
            {ws.opening && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-cream-50/60 backdrop-blur-[1px]">
                <Spinner size={24} />
              </div>
            )}
          </div>

          <ConsolePanel
            open={consoleOpen}
            onToggle={() => setConsoleOpen((o) => !o)}
            stdin={stdin}
            onStdinChange={setStdin}
            running={running}
            result={result}
            error={execError}
          />
        </main>
      </div>

      {/* ---- status bar ---- */}
      <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-cream-300 bg-lav-50 px-3 text-[11px] text-ink-500">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              ws.ready ? "bg-status-online" : "bg-status-idle animate-pulse"
            )}
          />
          {ws.ready ? "Connected" : "Reconnecting…"}
        </span>

        {openDoc && (
          <span className={cn("flex items-center gap-1 font-medium", syncMeta.className)}>
            <syncMeta.icon size={11} className={syncState === "syncing" ? "animate-spin" : ""} />
            {syncMeta.label}
          </span>
        )}

        {typingNames.length > 0 && (
          <span className="truncate italic text-lav-700">
            {typingNames.slice(0, 2).join(", ")}
            {typingNames.length > 2 ? ` +${typingNames.length - 2}` : ""} typing…
          </span>
        )}

        <span className="ml-auto flex items-center gap-3">
          {cursor && (
            <span>
              Ln {cursor.lineNumber}, Col {cursor.column}
            </span>
          )}
          {openDoc && <span>{ws.languages[fileLanguage]?.label || fileLanguage}</span>}
          {version != null && <span>v{version}</span>}
          <span>
            {ws.participants.length} online
          </span>
        </span>
      </footer>

      {/* ---- modals ---- */}
      <FilePathModal
        open={modal?.mode === "create"}
        onClose={() => setModal(null)}
        title="New file"
        submitLabel="Create"
        onSubmit={async (path) => {
          try {
            const file = await ws.createFile(path);
            await ws.openFile(idOf(file._id));
          } catch (err) {
            throw new Error(apiMessage(err, err.message), { cause: err });
          }
        }}
      />
      <FilePathModal
        open={modal?.mode === "rename"}
        onClose={() => setModal(null)}
        title="Rename file"
        initialPath={modal?.file?.path || ""}
        submitLabel="Rename"
        onSubmit={async (path) => {
          try {
            await ws.renameFile(idOf(modal.file._id), path);
          } catch (err) {
            throw new Error(apiMessage(err, err.message), { cause: err });
          }
        }}
      />
      <FilePathModal
        open={modal?.mode === "create-folder"}
        onClose={() => setModal(null)}
        title="New folder"
        submitLabel="Create"
        fieldLabel="Folder path"
        hint='Use "/" for nested folders, e.g. src/utils.'
        placeholder="src/utils"
        onSubmit={async (path) => {
          try {
            await ws.createFolder(path);
          } catch (err) {
            throw new Error(apiMessage(err, err.message), { cause: err });
          }
        }}
      />
      <FilePathModal
        open={modal?.mode === "rename-folder"}
        onClose={() => setModal(null)}
        title="Rename folder"
        initialPath={modal?.path || ""}
        submitLabel="Rename"
        fieldLabel="Folder path"
        hint='Use "/" for nested folders, e.g. src/utils.'
        placeholder="src/utils"
        onSubmit={async (path) => {
          try {
            await ws.renameFolder(modal.path, path);
          } catch (err) {
            throw new Error(apiMessage(err, err.message), { cause: err });
          }
        }}
      />
    </div>
  );
};

export default IdePage;
