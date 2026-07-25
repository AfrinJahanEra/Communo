import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { getSocket, emitAck } from "../../lib/socket";
import { idOf } from "../../lib/utils";
import { useSocketEvent } from "../../hooks/useSocket";

/**
 * Monaco wrapper with server-authoritative realtime sync:
 *  - local edits  → `code:edit { fileId, baseVersion, ops }` (acked, chained
 *    so every edit uses the version confirmed by the previous ack)
 *  - remote edits → `code:edited` applied as one atomic executeEdits batch
 *  - stale base   → ack `{ resync }` replaces the whole doc (rebase-by-reload)
 *  - cursors      → volatile `cursor:move` / `cursor:update` ghost cursors
 * The parent remounts this component per open file (key = fileId + nonce).
 */

const CURSOR_THROTTLE_MS = 90;
const TYPING_IDLE_MS = 1600;

/** One injected <style> holds per-user cursor/selection colors. */
const styleFor = (userId, color) =>
  `.rc-cursor-${userId}{border-left:2px solid ${color};}` +
  `.rc-sel-${userId}{background:${color}30;}` +
  `.rc-label-${userId}{background:${color};}`;

const EDITOR_OPTIONS = {
  fontSize: 13.5,
  fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
  fontLigatures: true,
  lineNumbers: "on",
  folding: true,
  bracketPairColorization: { enabled: true },
  matchBrackets: "always",
  automaticLayout: true,
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  cursorBlinking: "smooth",
  renderLineHighlight: "gutter",
  padding: { top: 12 },
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
  suggestSelection: "first",
  quickSuggestions: true,
  tabSize: 4,
};

export const CodeEditor = ({
  fileId,
  language,
  initialContent,
  initialVersion,
  minimap,
  onSyncStateChange, // "synced" | "syncing" | "resynced"
  onVersionChange,
  onCursorChange, // { lineNumber, column }
  onSave, // Ctrl/Cmd+S
  apiRef, // exposes { getValue } to the parent (run/download need live content)
}) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const versionRef = useRef(initialVersion);
  const suppressRef = useRef(false);
  const sendChainRef = useRef(Promise.resolve());
  const pendingRef = useRef(0);
  const disposablesRef = useRef([]);
  const cursorsRef = useRef(new Map()); // userId -> { widget, decorations, styleEl }
  const cursorThrottleRef = useRef({ last: 0, timer: null });
  const typingRef = useRef({ active: false, timer: null });

  // Latest callbacks without re-mounting Monaco listeners
  const callbacksRef = useRef({});
  useEffect(() => {
    callbacksRef.current = { onSyncStateChange, onVersionChange, onCursorChange, onSave };
  }, [onSyncStateChange, onVersionChange, onCursorChange, onSave]);

  const setVersion = (version) => {
    versionRef.current = version;
    callbacksRef.current.onVersionChange?.(version);
  };

  // ---------- remote cursors ----------
  const removeCursor = (userId) => {
    const entry = cursorsRef.current.get(userId);
    if (!entry) return;
    editorRef.current?.removeContentWidget(entry.widget);
    entry.decorations?.clear();
    entry.styleEl?.remove();
    cursorsRef.current.delete(userId);
  };

  const upsertCursor = ({ userId, username, color, position, selection }) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !editor.getModel()) return;
    const uid = idOf(userId);

    let entry = cursorsRef.current.get(uid);
    if (!entry) {
      const styleEl = document.createElement("style");
      styleEl.textContent = styleFor(uid, color);
      document.head.appendChild(styleEl);

      const node = document.createElement("div");
      node.className = `rc-label-${uid} pointer-events-none rounded px-1 py-px text-[10px] font-semibold text-white`;
      node.textContent = username;
      const widget = {
        getId: () => `remote-cursor-${uid}`,
        getDomNode: () => node,
        getPosition: () => ({
          position: entry?.position ?? position,
          preference: [
            monaco.editor.ContentWidgetPositionPreference.ABOVE,
            monaco.editor.ContentWidgetPositionPreference.BELOW,
          ],
        }),
      };
      entry = { widget, decorations: editor.createDecorationsCollection([]), styleEl, position };
      cursorsRef.current.set(uid, entry);
      editor.addContentWidget(widget);
    }

    entry.position = position;
    const decorations = [
      {
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        options: { className: `rc-cursor-${uid}`, hoverMessage: { value: username } },
      },
    ];
    if (
      selection &&
      (selection.startLineNumber !== selection.endLineNumber ||
        selection.startColumn !== selection.endColumn)
    ) {
      decorations.push({
        range: new monaco.Range(
          selection.startLineNumber,
          selection.startColumn,
          selection.endLineNumber,
          selection.endColumn
        ),
        options: { className: `rc-sel-${uid}` },
      });
    }
    entry.decorations.set(decorations);
    editor.layoutContentWidget(entry.widget);
  };

  // ---------- outgoing edits ----------
  const sendOps = (ops) => {
    pendingRef.current += 1;
    callbacksRef.current.onSyncStateChange?.("syncing");
    // Chained: baseVersion is read after the previous ack resolved
    sendChainRef.current = sendChainRef.current.then(async () => {
      const ack = await emitAck("code:edit", {
        fileId,
        baseVersion: versionRef.current,
        ops,
      });
      pendingRef.current -= 1;
      if (ack.success && ack.resync) {
        // Our base was stale: adopt the authoritative doc wholesale
        suppressRef.current = true;
        const editor = editorRef.current;
        const pos = editor?.getPosition();
        editor?.getModel()?.setValue(ack.content);
        if (pos) editor?.setPosition(pos);
        suppressRef.current = false;
        setVersion(ack.version);
        callbacksRef.current.onSyncStateChange?.("resynced");
        return;
      }
      if (ack.success) setVersion(ack.version);
      if (pendingRef.current === 0) callbacksRef.current.onSyncStateChange?.("synced");
    });
  };

  const emitTyping = () => {
    const socket = getSocket();
    if (!socket?.connected) return;
    const state = typingRef.current;
    if (!state.active) {
      state.active = true;
      socket.emit("workspace:typing", { fileId, isTyping: true });
    }
    clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      state.active = false;
      socket.emit("workspace:typing", { fileId, isTyping: false });
    }, TYPING_IDLE_MS);
  };

  // ---------- incoming events ----------
  useSocketEvent(
    "code:edited",
    (payload) => {
      if (idOf(payload.fileId) !== idOf(fileId)) return;
      const editor = editorRef.current;
      const model = editor?.getModel();
      const monaco = monacoRef.current;
      if (!editor || !model || !monaco) return;

      // Ranges are computed against the pre-edit doc, then applied atomically
      const edits = [...payload.ops]
        .sort((a, b) => b.rangeOffset - a.rangeOffset)
        .map((op) => {
          const start = model.getPositionAt(op.rangeOffset);
          const end = model.getPositionAt(op.rangeOffset + op.rangeLength);
          return {
            range: new monaco.Range(
              start.lineNumber,
              start.column,
              end.lineNumber,
              end.column
            ),
            text: op.text,
            forceMoveMarkers: true,
          };
        });
      suppressRef.current = true;
      editor.executeEdits("remote", edits);
      suppressRef.current = false;
      setVersion(payload.version);
    },
    [fileId]
  );

  useSocketEvent(
    "cursor:update",
    (payload) => {
      if (idOf(payload.fileId) !== idOf(fileId)) return;
      upsertCursor(payload);
    },
    [fileId]
  );

  useSocketEvent(
    "file:user-closed",
    (payload) => {
      if (idOf(payload.fileId) !== idOf(fileId)) return;
      removeCursor(idOf(payload.userId));
    },
    [fileId]
  );

  useSocketEvent("workspace:user-left", (payload) => {
    removeCursor(idOf(payload.userId));
  });

  // ---------- mount / teardown ----------
  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    if (apiRef) apiRef.current = { getValue: () => editor.getValue() };

    monaco.editor.defineTheme("codecord", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#ffffff",
        "editorLineNumber.foreground": "#a19aab",
        "editorLineNumber.activeForeground": "#77629f",
        "editor.lineHighlightBackground": "#f4f1fa",
        "editor.selectionBackground": "#d4cbe8",
        "editorCursor.foreground": "#8f7ab8",
        "editorIndentGuide.background": "#f2f2f5",
      },
    });
    monaco.editor.setTheme("codecord");

    disposablesRef.current.push(
      editor.onDidChangeModelContent((event) => {
        if (suppressRef.current) return;
        const ops = [...event.changes]
          .sort((a, b) => b.rangeOffset - a.rangeOffset)
          .map(({ rangeOffset, rangeLength, text }) => ({ rangeOffset, rangeLength, text }));
        if (ops.length) {
          sendOps(ops);
          emitTyping();
        }
      }),
      editor.onDidChangeCursorPosition((event) => {
        callbacksRef.current.onCursorChange?.(event.position);
        const socket = getSocket();
        if (!socket?.connected) return;
        const throttle = cursorThrottleRef.current;
        const send = () => {
          throttle.last = Date.now();
          const selection = editor.getSelection();
          socket.emit("cursor:move", {
            fileId,
            position: { lineNumber: event.position.lineNumber, column: event.position.column },
            ...(selection && !selection.isEmpty()
              ? {
                  selection: {
                    startLineNumber: selection.startLineNumber,
                    startColumn: selection.startColumn,
                    endLineNumber: selection.endLineNumber,
                    endColumn: selection.endColumn,
                  },
                }
              : {}),
          });
        };
        const elapsed = Date.now() - throttle.last;
        clearTimeout(throttle.timer);
        if (elapsed >= CURSOR_THROTTLE_MS) send();
        else throttle.timer = setTimeout(send, CURSOR_THROTTLE_MS - elapsed);
      }),
      editor.addAction({
        id: "codecord.save",
        label: "Save file",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        run: () => callbacksRef.current.onSave?.(),
      })
    );

    editor.focus();
  };

  useEffect(
    () => () => {
      disposablesRef.current.forEach((d) => d.dispose());
      disposablesRef.current = [];
      cursorsRef.current.forEach((entry) => {
        entry.decorations?.clear();
        entry.styleEl?.remove();
      });
      cursorsRef.current.clear();
      clearTimeout(cursorThrottleRef.current.timer);
      const typing = typingRef.current;
      clearTimeout(typing.timer);
      if (typing.active) getSocket()?.emit("workspace:typing", { fileId, isTyping: false });
    },
    [fileId]
  );

  return (
    <Editor
      height="100%"
      language={language}
      defaultValue={initialContent}
      onMount={handleMount}
      theme="codecord"
      options={{ ...EDITOR_OPTIONS, minimap: { enabled: minimap } }}
      loading={
        <div className="flex h-full items-center justify-center text-sm text-ink-500">
          Loading editor…
        </div>
      }
    />
  );
};
