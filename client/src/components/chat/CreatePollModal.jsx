import { useState } from "react";
import { Plus, Smile, Trash2, X } from "lucide-react";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

/**
 * Poll builder popup, shared by "create a poll" and "edit this poll" — the
 * caller decides via initialQuestion/initialOptions/submitLabel/onSubmit.
 * Layout matches the reference design: X — title — Post, question field,
 * then an editable answers list.
 */
export const CreatePollModal = ({
  open,
  onClose,
  title = "Create Poll",
  submitLabel = "Post",
  initialQuestion = "",
  initialOptions,
  onSubmit,
}) => {
  const seedOptions = () =>
    initialOptions && initialOptions.length >= MIN_OPTIONS ? initialOptions : ["", ""];

  const [question, setQuestion] = useState(initialQuestion);
  const [options, setOptions] = useState(seedOptions);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Re-seed the fields each time the dialog opens (render-time adjustment)
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuestion(initialQuestion);
      setOptions(seedOptions());
      setError("");
    }
  }

  if (!open) return null;

  const filledCount = options.filter((o) => o.trim()).length;
  const canSubmit = question.trim().length > 0 && filledCount >= MIN_OPTIONS && !busy;

  const updateOption = (i, value) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));

  const removeOption = (i) => setOptions((prev) => prev.filter((_, idx) => idx !== i));

  const addOption = () =>
    setOptions((prev) => (prev.length < MAX_OPTIONS ? [...prev, ""] : prev));

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit({
        question: question.trim(),
        options: options.map((o) => o.trim()).filter(Boolean),
      });
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-cream-50 shadow-xl animate-pop"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-cream-300 px-3 py-3.5">
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-cream-200"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <h2 className="text-sm font-bold text-ink-900">{title}</h2>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-lg px-2 py-1 text-sm font-bold text-lav-600 transition hover:text-lav-700 disabled:opacity-40"
          >
            {busy ? "…" : submitLabel}
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-4 py-4">
          {error && <p className="text-xs text-status-dnd">{error}</p>}

          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-300">Question</p>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What question do you want to ask?"
              maxLength={300}
              rows={2}
              autoFocus
              className="input-base w-full resize-none"
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-300">Answers</p>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-cream-300 bg-white px-2 py-1.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream-200 text-ink-500">
                    <Smile size={15} />
                  </span>
                  <input
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder="Type your answer"
                    maxLength={80}
                    className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-300"
                  />
                  {options.length > MIN_OPTIONS && (
                    <button
                      onClick={() => removeOption(i)}
                      className="shrink-0 rounded-lg p-1.5 text-ink-300 transition hover:bg-cream-200 hover:text-status-dnd"
                      aria-label="Remove answer"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < MAX_OPTIONS && (
              <button
                onClick={addOption}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-cream-200/70 px-3 py-2.5 text-sm font-medium text-ink-500 transition hover:bg-cream-300/70"
              >
                <Plus size={16} /> Add another answer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
