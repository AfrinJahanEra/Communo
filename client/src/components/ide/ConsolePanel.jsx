import { ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { Spinner } from "../ui/Spinner";
import { cn } from "../../lib/utils";

/**
 * Bottom IDE panel: custom stdin + execution output from the JDoodle proxy.
 * Result shape: { status, output, cpuTime, memory } where status is
 * success | compile_error | runtime_error | limit_reached.
 */

const STATUS_META = {
  success: { label: "Success", chip: "bg-status-online/15 text-status-online" },
  compile_error: { label: "Compilation error", chip: "bg-status-dnd/15 text-status-dnd" },
  runtime_error: { label: "Runtime error", chip: "bg-status-dnd/15 text-status-dnd" },
  limit_reached: { label: "Limit reached", chip: "bg-status-idle/20 text-status-idle" },
};

export const ConsolePanel = ({
  open,
  onToggle,
  stdin,
  onStdinChange,
  running,
  result,
  error,
}) => (
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
      ) : result ? (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            (STATUS_META[result.status] || STATUS_META.success).chip
          )}
        >
          {(STATUS_META[result.status] || { label: result.status }).label}
        </span>
      ) : error ? (
        <span className="rounded-full bg-status-dnd/15 px-2 py-0.5 text-[10px] font-bold text-status-dnd">
          Failed
        </span>
      ) : null}

      <span className="ml-auto text-ink-300">
        {open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
      </span>
    </button>

    {open && (
      <div className="grid max-h-56 grid-cols-1 gap-px border-t border-cream-300 bg-cream-300 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex min-h-0 flex-col bg-cream-50 p-2.5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-300">Input (stdin)</p>
          <textarea
            value={stdin}
            onChange={(e) => onStdinChange(e.target.value)}
            placeholder="Program input, one value per line…"
            spellCheck={false}
            className="min-h-0 flex-1 resize-none rounded-lg border border-cream-300 bg-cream-100 p-2 font-mono text-xs text-ink-900 outline-none transition placeholder:text-ink-300 focus:border-lav-400"
          />
        </div>

        <div className="flex min-h-0 flex-col bg-cream-50 p-2.5">
          <div className="mb-1 flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-300">Output</p>
            {result && !running && (
              <p className="text-[10px] text-ink-300">
                {result.cpuTime != null && <>CPU {result.cpuTime}s</>}
                {result.memory != null && <> · {result.memory} KB</>}
              </p>
            )}
          </div>
          <pre
            className={cn(
              "min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-lg border border-cream-300 bg-cream-100 p-2 font-mono text-xs",
              error || (result && result.status !== "success") ? "text-status-dnd" : "text-ink-900"
            )}
          >
            {running
              ? "Executing…"
              : error
                ? error
                : result
                  ? result.output || "(no output)"
                  : "Run the file to see its output here."}
          </pre>
        </div>
      </div>
    )}
  </section>
);
