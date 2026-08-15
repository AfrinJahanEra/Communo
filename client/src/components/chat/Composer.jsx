import { useRef, useState } from "react";
import { Code2, FileText, Paperclip, SendHorizonal, X } from "lucide-react";
import { Spinner } from "../ui/Spinner";
import { cn, formatBytes } from "../../lib/utils";
import { uploadAttachment } from "../../services/attachmentService";

const MAX_LENGTH = 2000;
const MAX_FILES = 10;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // matches the server-side limit

const isImageFile = (file) => file.type.startsWith("image/");

const FilePreviewChip = ({ entry, onRemove }) => (
  <div className="flex items-center gap-2 rounded-xl border border-cream-300 bg-white py-1.5 pl-1.5 pr-2 shadow-sm">
    {entry.previewUrl ? (
      <img src={entry.previewUrl} alt={entry.file.name} className="h-9 w-9 rounded-lg object-cover" />
    ) : (
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream-200 text-ink-500">
        <FileText size={16} />
      </span>
    )}
    <div className="max-w-[10rem] leading-tight">
      <p className="truncate text-xs font-medium text-ink-900">{entry.file.name}</p>
      <p className="text-[10px] text-ink-300">{formatBytes(entry.file.size)}</p>
    </div>
    <button
      type="button"
      onClick={() => onRemove(entry.id)}
      title="Remove"
      className="ml-1 shrink-0 rounded-full p-1 text-ink-300 transition hover:bg-cream-200 hover:text-status-dnd"
    >
      <X size={12} />
    </button>
  </div>
);

/**
 * Message composer: auto-growing textarea, Enter sends (Shift+Enter =
 * newline), typing broadcast, file attachments + a helper that wraps a
 * code snippet in fences.
 */
export const Composer = ({ placeholder, disabled, disabledHint, onSend, onTyping, onStopTyping }) => {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState([]); // [{ id, file, previewUrl }]
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    setError("");
    setFiles((prev) => {
      const room = MAX_FILES - prev.length;
      if (room <= 0) {
        setError(`You can attach up to ${MAX_FILES} files`);
        return prev;
      }
      const accepted = [];
      for (const file of incoming.slice(0, room)) {
        if (file.size > MAX_FILE_SIZE) {
          setError(`"${file.name}" is larger than ${formatBytes(MAX_FILE_SIZE)}`);
          continue;
        }
        accepted.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          previewUrl: isImageFile(file) ? URL.createObjectURL(file) : null,
        });
      }
      return [...prev, ...accepted];
    });
  };

  const removeFile = (id) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const submit = async () => {
    const content = value.trim();
    if ((!content && files.length === 0) || sending) return;
    if (content.length > MAX_LENGTH) {
      setError(`Messages are limited to ${MAX_LENGTH} characters`);
      return;
    }
    setSending(true);
    setError("");
    try {
      const attachments = files.length
        ? await Promise.all(files.map((entry) => uploadAttachment(entry.file)))
        : [];
      await onSend(content, attachments);
      setValue("");
      files.forEach((entry) => entry.previewUrl && URL.revokeObjectURL(entry.previewUrl));
      setFiles([]);
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

  const canSubmit = (value.trim().length > 0 || files.length > 0) && !sending;

  return (
    <div className="border-t border-cream-300 bg-cream-50 px-4 py-3">
      {error && <p className="mb-1.5 text-xs text-status-dnd">{error}</p>}
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((entry) => (
            <FilePreviewChip key={entry.id} entry={entry} onRemove={removeFile} />
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 rounded-2xl border border-cream-300 bg-white px-3 py-2 shadow-sm transition focus-within:border-lav-400 focus-within:ring-2 focus-within:ring-lav-200">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach files"
          className="mb-0.5 shrink-0 rounded-lg p-1.5 text-ink-300 transition hover:bg-lav-50 hover:text-lav-600"
        >
          <Paperclip size={18} />
        </button>
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
          disabled={!canSubmit}
          title="Send"
          className={cn(
            "mb-0.5 shrink-0 rounded-xl p-2 transition",
            canSubmit
              ? "bg-lav-500 text-white shadow-sm hover:bg-lav-600"
              : "bg-cream-200 text-ink-300"
          )}
        >
          {sending ? <Spinner size={16} /> : <SendHorizonal size={16} />}
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
