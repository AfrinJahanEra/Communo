import { useRef, useState } from "react";
import { Code2, SendHorizonal } from "lucide-react";
import { cn } from "../../lib/utils";

const MAX_LENGTH = 2000;

/**
 * Message composer: auto-growing textarea, Enter sends (Shift+Enter =
 * newline), typing broadcast + a helper that wraps a code snippet in fences.
 */
export const Composer = ({ placeholder, disabled, disabledHint, onSend, onTyping, onStopTyping }) => {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const submit = async () => {
    const content = value.trim();
    if (!content || sending) return;
    if (content.length > MAX_LENGTH) {
      setError(`Messages are limited to ${MAX_LENGTH} characters`);
      return;
    }
    setSending(true);
    setError("");
    try {
      await onSend(content);
      setValue("");
      onStopTyping?.();
      requestAnimationFrame(resize);
    } catch (err) {
      setError(err.message || "Could not send the message");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const insertCodeBlock = () => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const snippet = "```\n" + (selected || "") + "\n```";
    const next = value.slice(0, start) + snippet + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + 4 + selected.length;
      el?.setSelectionRange(pos, pos);
      resize();
    });
  };

  if (disabled) {
    return (
      <div className="border-t border-cream-300 bg-cream-100/70 px-4 py-3.5 text-center text-xs text-ink-300">
        {disabledHint || "You cannot send messages here."}
      </div>
    );
  }

  return (
    <div className="border-t border-cream-300 bg-cream-50 px-4 py-3">
      {error && <p className="mb-1.5 text-xs text-status-dnd">{error}</p>}
      <div className="flex items-end gap-2 rounded-2xl border border-cream-300 bg-white px-3 py-2 shadow-sm transition focus-within:border-lav-400 focus-within:ring-2 focus-within:ring-lav-200">
        <button
          type="button"
          onClick={insertCodeBlock}
          title="Insert code snippet"
          className="mb-0.5 shrink-0 rounded-lg p-1.5 text-ink-300 transition hover:bg-lav-50 hover:text-lav-600"
        >
          <Code2 size={18} />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            onTyping?.();
            resize();
          }}
          onKeyDown={onKeyDown}
          onBlur={() => onStopTyping?.()}
          placeholder={placeholder}
          rows={1}
          maxLength={MAX_LENGTH + 500}
          className="max-h-[200px] min-w-0 flex-1 resize-none bg-transparent py-1 text-sm text-ink-900 outline-none placeholder:text-ink-300"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim() || sending}
          title="Send"
          className={cn(
            "mb-0.5 shrink-0 rounded-xl p-2 transition",
            value.trim() && !sending
              ? "bg-lav-500 text-white shadow-sm hover:bg-lav-600"
              : "bg-cream-200 text-ink-300"
          )}
        >
          <SendHorizonal size={16} />
        </button>
      </div>
      {value.length > MAX_LENGTH - 200 && (
        <p className={cn("mt-1 text-right text-[11px]", value.length > MAX_LENGTH ? "text-status-dnd" : "text-ink-300")}>
          {MAX_LENGTH - value.length} characters left
        </p>
      )}
    </div>
  );
};
