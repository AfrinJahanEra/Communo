import { useState } from "react";
import { Check } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { cn } from "../../lib/utils";

/**
 * "Options + submit" popup opened from a poll card. Pre-selects the
 * viewer's current vote (if any), so the submit button reads "Change vote"
 * instead of "Submit vote" for someone who's already voted.
 */
export const PollVoteModal = ({ open, onClose, message, viewerId, onSubmit }) => {
  const poll = message?.poll;
  const options = poll?.options || [];
  const currentVoteId = options.find((o) =>
    (o.voterIds || []).some((id) => String(id) === String(viewerId))
  )?._id;

  const [selected, setSelected] = useState(currentVoteId ? String(currentVoteId) : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSelected(currentVoteId ? String(currentVoteId) : null);
      setError("");
    }
  }

  if (!open || !poll) return null;

  const submit = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit(selected);
      onClose();
    } catch (err) {
      setError(err.message || "Could not submit your vote");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={poll.question} size="sm">
      <div className="space-y-2">
        {error && <p className="text-xs text-status-dnd">{error}</p>}
        {options.map((option) => {
          const id = String(option._id);
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                active
                  ? "border-lav-400 bg-lav-50 text-lav-800"
                  : "border-cream-300 bg-white text-ink-700 hover:bg-cream-100"
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                  active ? "border-lav-500 bg-lav-500" : "border-cream-400"
                )}
              >
                {active && <Check size={11} className="text-white" />}
              </span>
              <span className="truncate">{option.text}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={submit} loading={busy} disabled={!selected}>
          {currentVoteId ? "Change vote" : "Submit vote"}
        </Button>
      </div>
    </Modal>
  );
};
