import { Sparkles } from "lucide-react";

/** Discord-like "/" command suggestion popup, anchored above the composer. */
export const SlashCommandMenu = ({ commands, onSelect }) => (
  <div className="absolute bottom-full left-4 z-40 mb-2 w-72 overflow-hidden rounded-xl border border-cream-300 bg-white py-1 shadow-lg animate-pop">
    {commands.map((c) => (
      <button
        key={c.command}
        type="button"
        onClick={() => onSelect(c)}
        className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition hover:bg-lav-50"
      >
        <Sparkles size={15} className="mt-0.5 shrink-0 text-lav-600" />
        <span>
          <span className="block text-sm font-semibold text-ink-900">✨ /{c.command}</span>
          <span className="block text-xs text-ink-300">{c.description}</span>
        </span>
      </button>
    ))}
  </div>
);
