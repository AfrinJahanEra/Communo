import { useEffect, useState } from "react";
import { Pin, X } from "lucide-react";
import { Spinner } from "../ui/Spinner";
import { Avatar } from "../ui/Avatar";
import { useClickOutside } from "../../hooks/useClickOutside";
import { displayNameOf, formatTime } from "../../lib/utils";

/**
 * Dropdown panel listing pinned messages for the current channel/thread.
 * `fetchPins` returns the pinned messages (newest first).
 */
export const PinsPanel = ({ fetchPins, onClose }) => {
  const ref = useClickOutside(onClose, true);
  const [pins, setPins] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetchPins()
      .then((list) => alive && setPins(list))
      .catch(() => alive && setError("Could not load pinned messages"));
    return () => {
      alive = false;
    };
  }, [fetchPins]);

  return (
    <div
      ref={ref}
      className="absolute right-2 top-14 z-30 w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-cream-300 bg-white shadow-xl animate-pop"
    >
      <div className="flex items-center justify-between border-b border-cream-300 bg-cream-100/70 px-4 py-2.5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-700">
          <Pin size={13} /> Pinned messages
        </p>
        <button onClick={onClose} className="rounded p-1 text-ink-300 hover:text-ink-700">
          <X size={15} />
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto p-2">
        {error ? (
          <p className="px-3 py-6 text-center text-xs text-status-dnd">{error}</p>
        ) : pins === null ? (
          <div className="flex justify-center py-6">
            <Spinner size={18} />
          </div>
        ) : pins.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-ink-300">
            No pinned messages yet — message managers can pin important ones.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {pins.map((message) => {
              const author = typeof message.authorId === "object" ? message.authorId : null;
              return (
                <li key={message._id} className="rounded-xl border border-cream-200 p-2.5">
                  <div className="mb-1 flex items-center gap-2">
                    <Avatar user={author} size="xs" />
                    <span className="text-xs font-bold text-ink-900">{displayNameOf(author)}</span>
                    <span className="text-[10px] text-ink-300">{formatTime(message.createdAt)}</span>
                  </div>
                  <p className="line-clamp-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-700">
                    {message.content}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
