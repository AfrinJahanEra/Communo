import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Square, Terminal, Trash2 } from "lucide-react";
import { Spinner } from "../ui/Spinner";
import { cn } from "../../lib/utils";

/**
 * VS Code-style terminal: program output streams in live (stdout / stderr /
 * system notes), and the input line at the bottom feeds the running program
 * — type a line, press Enter, it is written to its stdin. Lines typed before
 * a run are queued and delivered when the program starts.
 */

const STATUS_META = {
  success: { label: "Success", chip: "bg-status-online/15 text-status-online" },
  compile_error: { label: "Compilation error", chip: "bg-status-dnd/15 text-status-dnd" },
  runtime_error: { label: "Runtime error", chip: "bg-status-dnd/15 text-status-dnd" },
  stopped: { label: "Stopped", chip: "bg-status-idle/20 text-status-idle" },
  limit_reached: { label: "Limit reached", chip: "bg-status-idle/20 text-status-idle" },
};

const STREAM_STYLES = {
  stdout: "text-zinc-100",
  stderr: "text-red-300",
  system: "italic text-lav-300",
  stdin: "text-emerald-300",
};

export const ConsolePanel = ({
  open,
  onToggle,
  lines,
  running,
  endInfo,
  error,
  onLine,
  onStop,
  onClear,
}) => {
  const [value, setValue] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Keep the terminal pinned to the newest output
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, running, open]);

  const submit = () => {
    const line = value;
    if (!line.trim()) return;
    setValue("");
    onLine(line);
  };

  const status = endInfo?.status;

  return (
    <section className="shrink-0 border-t border-cream-300 bg-cream-50">
      <button
        onClick={onToggle}
        className="flex h-9 w-full items-center gap-2 px-3 text-left transition hover:bg-cream-200/60"
        aria-expanded={open}
      >
        <Terminal size={14} className="text-lav-600" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Console</span>

        {running ? (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-lav-700">
            <Spinner size={12} /> Running…
          </span>
        ) : status ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold",
              (STATUS_META[status] || STATUS_META.success).chip
            )}
          >
            {(STATUS_META[status] || { label: status }).label}
          </span>
        ) : error ? (
          <span className="rounded-full bg-status-dnd/15 px-2 py-0.5 text-[10px] font-bold text-status-dnd">
            Failed
          </span>
        ) : null}

        {!running && endInfo?.ms != null && (
          <span className="text-[10px] text-ink-300">{(endInfo.ms / 1000).toFixed(2)}s</span>
        )}
        {!running && endInfo?.mode && (
          <span className="rounded-full bg-lav-100 px-2 py-0.5 text-[10px] font-bold text-lav-700">
            {endInfo.mode === "interactive" ? "Local · interactive" : "Cloud · batch"}
          </span>
        )}

        <span className="ml-auto flex items-center gap-1">
          {running && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onStop();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  onStop();
                }
              }}
              className="flex items-center gap-1 rounded-md bg-status-dnd/10 px-2 py-1 text-[10px] font-bold text-status-dnd transition hover:bg-status-dnd/20"
              title="Stop the running program"
            >
              <Square size={10} /> Stop
            </span>
          )}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                onClear();
              }
            }}
            className="rounded-md p-1 text-ink-300 transition hover:bg-cream-200 hover:text-ink-900"
            title="Clear console"
          >
            <Trash2 size={13} />
          </span>
          <span className="text-ink-300">{open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}</span>
        </span>
      </button>

      {open && (
        <div className="border-t border-cream-300">
          {/* terminal output */}
          <div
            ref={scrollRef}
            onClick={() => inputRef.current?.focus()}
            className="h-52 overflow-y-auto bg-ink-900 px-3 py-2 font-mono text-xs leading-5"
          >
            {lines.length === 0 && !running && (
              <p className="text-zinc-500">
                Press Run — output streams here in real time. Type input below any time: lines are
                sent to the program while it runs (or queued until you Run).
              </p>
            )}
            {error && <pre className="whitespace-pre-wrap text-red-300">{error}</pre>}
            {lines.map((line, i) => (
              <pre
                key={i}
                className={cn("whitespace-pre-wrap", STREAM_STYLES[line.stream] || "text-zinc-100")}
              >
                {line.stream === "stdin" ? `› ${line.text}` : line.text}
              </pre>
            ))}
            {running && <span className="animate-pulse text-lav-300">▍</span>}
          </div>

          {/* stdin line */}
          <div className="flex items-center gap-2 border-t border-white/10 bg-ink-900 px-3 py-2">
            <span className="font-mono text-xs font-bold text-lav-300">›</span>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder={
                running
                  ? "Type a line for the running program and press Enter…"
                  : "Type input lines (queued until you Run)…"
              }
              spellCheck={false}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent font-mono text-xs text-zinc-100 outline-none placeholder:text-zinc-500"
            />
          </div>
        </div>
      )}
    </section>
  );
};
