import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Fenced code snippet with language tag + copy button. */
export const CodeBlock = ({ lang, code }) => {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — user can select manually */
    }
  };

  return (
    <div className="group/code my-1.5 max-w-2xl overflow-hidden rounded-xl border border-ink-900/10 bg-ink-900">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-lav-300">
          {lang || "code"}
        </span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-cream-200/70 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[12.5px] leading-relaxed text-cream-100">
        <code>{code}</code>
      </pre>
    </div>
  );
};
