import { useEffect, useState } from "react";
import { Download, Sparkles, X } from "lucide-react";
import { Spinner } from "../ui/Spinner";
import { EmptyState } from "../ui/EmptyState";
import { apiMessage } from "../../lib/api";
import { saveBlob } from "../../lib/utils";

const buildSummaryText = (summary, title) => {
  const lines = [`# ✨ Chat Summary — ${title}`, `Generated ${new Date().toLocaleString()}`, ""];
  lines.push("## Overview", summary.overview, "");
  if (summary.keyPoints?.length) {
    lines.push("## Key Points", ...summary.keyPoints.map((p) => `- ${p}`), "");
  }
  if (summary.decisions?.length) {
    lines.push("## Decisions", ...summary.decisions.map((d) => `- ${d}`), "");
  }
  if (summary.actionItems?.length) {
    lines.push("## Action Items", ...summary.actionItems.map((a) => `- ${a.user}: ${a.task}`), "");
  }
  if (summary.unresolved?.length) {
    lines.push("## Unresolved", ...summary.unresolved.map((u) => `- ${u}`), "");
  }
  lines.push(`_Based on the last ${summary.messageCount} message${summary.messageCount === 1 ? "" : "s"}._`);
  return lines.join("\n");
};

/**
 * Right-side drawer showing an on-demand, non-persisted AI summary of a
 * channel's or DM's recent messages. `requestId` is bumped by the parent
 * every time summarize is invoked, even while already open, to trigger a
 * refetch. `fetchSummary` is the service call for the current scope
 * (channel or DM), and `title` labels the heading/downloaded file.
 */
export const SummaryPanel = ({ id, title, fetchSummary, requestId, onClose }) => {
  // `result.requestId` lags behind `requestId` while a fetch is in flight —
  // that mismatch IS the loading state, so no separate setState-in-effect is needed.
  const [result, setResult] = useState({ requestId: 0, summary: null, error: "" });
  const loading = result.requestId !== requestId;
  const { summary, error } = result;

  useEffect(() => {
    let alive = true;
    fetchSummary(id)
      .then((data) => alive && setResult({ requestId, summary: data, error: "" }))
      .catch((err) => alive && setResult({ requestId, summary: null, error: apiMessage(err) }));
    return () => {
      alive = false;
    };
  }, [id, requestId, fetchSummary]);

  const handleDownload = () => {
    if (!summary) return;
    const text = buildSummaryText(summary, title);
    saveBlob(
      new Blob([text], { type: "text/markdown;charset=utf-8" }),
      `summary-${title}-${Date.now()}.md`
    );
  };

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-[min(24rem,100vw)] flex-col border-l border-cream-300 bg-cream-50 shadow-xl animate-slide-up md:static md:z-auto md:w-96 md:animate-none md:shadow-none">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-cream-300 px-4">
        <Sparkles size={16} className="text-lav-600" />
        <p className="flex-1 text-sm font-bold text-ink-900">✨ Chat Summary</p>
        {summary && !loading && !error && (
          <button
            onClick={handleDownload}
            title="Download summary"
            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-cream-200"
          >
            <Download size={16} />
          </button>
        )}
        <button onClick={onClose} title="Close" className="rounded-lg p-1.5 text-ink-500 transition hover:bg-cream-200">
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Spinner size={22} />
            <p className="text-sm text-ink-500">Generating summary...</p>
          </div>
        ) : error ? (
          <EmptyState icon={Sparkles} title="Could not generate summary" body={error} className="h-full" />
        ) : (
          <div className="space-y-4">
            <section>
              <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-300">Overview</h2>
              <p className="text-sm leading-relaxed text-ink-700">{summary.overview}</p>
            </section>

            {summary.keyPoints?.length > 0 && (
              <section>
                <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-300">Key Points</h2>
                <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed text-ink-700">
                  {summary.keyPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </section>
            )}

            {summary.decisions?.length > 0 && (
              <section>
                <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-300">Decisions</h2>
                <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed text-ink-700">
                  {summary.decisions.map((decision, i) => (
                    <li key={i}>{decision}</li>
                  ))}
                </ul>
              </section>
            )}

            {summary.actionItems?.length > 0 && (
              <section>
                <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-300">Action Items</h2>
                <ul className="space-y-1.5 text-sm leading-relaxed text-ink-700">
                  {summary.actionItems.map((item, i) => (
                    <li key={i}>
                      <span className="font-semibold text-ink-900">{item.user}</span>: {item.task}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {summary.unresolved?.length > 0 && (
              <section>
                <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-300">Unresolved</h2>
                <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed text-ink-700">
                  {summary.unresolved.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </section>
            )}

            <p className="pt-1 text-[11px] text-ink-300">
              Based on the last {summary.messageCount} message{summary.messageCount === 1 ? "" : "s"}.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
