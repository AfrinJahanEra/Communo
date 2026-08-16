import { ListChecks } from "lucide-react";
import { Button } from "../ui/Button";
import { cn } from "../../lib/utils";

/**
 * Poll card rendered inside a chat message. Clicking anywhere on the card
 * (or the Vote/Change vote button) opens the vote picker; clicking a
 * specific option instead opens "who voted for this" (stopPropagation so
 * it doesn't also trigger the vote picker).
 */
export const PollBlock = ({ message, viewerId, onVote, onOpenVoters }) => {
  const poll = message.poll;
  if (!poll) return null;

  const options = poll.options || [];
  const totalVotes = options.reduce((sum, o) => sum + (o.voterIds?.length || 0), 0);
  const myOptionId = options.find((o) =>
    (o.voterIds || []).some((id) => String(id) === String(viewerId))
  )?._id;

  return (
    <div
      className="mt-1.5 w-full max-w-sm cursor-pointer rounded-2xl border border-cream-300 bg-white p-3.5 transition hover:border-lav-300"
      onClick={() => onVote(message)}
    >
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-lav-600">
        <ListChecks size={13} /> Poll
      </div>
      <p className="mb-3 text-sm font-bold leading-snug text-ink-900">{poll.question}</p>

      <div className="space-y-1.5">
        {options.map((option) => {
          const count = option.voterIds?.length || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const mine = String(myOptionId) === String(option._id);
          return (
            <button
              key={option._id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenVoters(message, option);
              }}
              className={cn(
                "relative block w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition",
                mine ? "border-lav-400" : "border-cream-300 hover:border-lav-200"
              )}
            >
              <span
                className={cn("absolute inset-y-0 left-0 transition-all", mine ? "bg-lav-100" : "bg-cream-200/70")}
                style={{ width: `${pct}%` }}
              />
              <span className="relative flex items-center justify-between gap-2">
                <span className="truncate text-ink-800">{option.text}</span>
                <span className="shrink-0 text-xs font-semibold text-ink-500">{count}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <p className="text-xs text-ink-300">
          {totalVotes} vote{totalVotes === 1 ? "" : "s"}
        </p>
        <Button
          size="sm"
          variant={myOptionId ? "outline" : "primary"}
          onClick={(e) => {
            e.stopPropagation();
            onVote(message);
          }}
        >
          {myOptionId ? "Change vote" : "Vote"}
        </Button>
      </div>
    </div>
  );
};
