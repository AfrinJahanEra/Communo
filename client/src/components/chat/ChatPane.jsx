import { useCallback, useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { Spinner } from "../ui/Spinner";
import { EmptyState } from "../ui/EmptyState";
import { MessageItem } from "./MessageItem";
import { Composer } from "./Composer";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { apiMessage } from "../../lib/api";
import { idOf, isGrouped } from "../../lib/utils";

const NEAR_BOTTOM_PX = 90;

const dayKey = (value) => new Date(value).toDateString();

const DayDivider = ({ date }) => (
  <div className="my-4 flex items-center gap-3 px-4">
    <span className="h-px flex-1 bg-cream-300" />
    <span className="text-[11px] font-semibold text-ink-300">
      {new Date(date).toLocaleDateString([], { weekday: "short", day: "numeric", month: "long" })}
    </span>
    <span className="h-px flex-1 bg-cream-300" />
  </div>
);

const TypingIndicator = ({ typers }) => {
  const names = Object.values(typers);
  if (names.length === 0) return null;
  const label =
    names.length === 1
      ? `${names[0]} is typing…`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing…`
        : "Several people are typing…";
  return (
    <div className="flex items-center gap-2 px-5 pb-1 text-xs text-ink-500">
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-lav-500"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
      {label}
    </div>
  );
};

/**
 * Complete chat surface for one scope (from useChat): scrolling message
 * list with cursor pagination, day dividers, typing dots and a composer.
 */
export const ChatPane = ({
  chat,
  placeholder,
  canManage = false,
  canPin = false,
  canSend = true,
  sendDisabledHint,
  onStartThread,
  onSummarize,
  onVotePoll,
  onOpenPollVoters,
  onEditPoll,
  emptyTitle = "No messages yet",
  emptyBody = "Be the first to say hi 👋",
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);
  const initialScrolled = useRef(false);

  const {
    messages,
    loading,
    loadingOlder,
    error,
    hasMore,
    typers,
    loadOlder,
    send,
    edit,
    remove,
    togglePin,
    toggleReaction,
    notifyTyping,
    stopTyping,
  } = chat;

  // Pin to bottom on first paint + whenever new messages arrive while stuck.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading) return;
    if (!initialScrolled.current) {
      el.scrollTop = el.scrollHeight;
      initialScrolled.current = true;
      return;
    }
    if (stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  // Reset the pin flag when the scope changes (chat identity changes).
  useEffect(() => {
    if (loading) {
      stickToBottom.current = true;
      initialScrolled.current = false;
    }
  }, [loading]);

  const onScroll = useCallback(async () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (el.scrollTop < 60 && hasMore && !loadingOlder) {
      const prevHeight = el.scrollHeight;
      const prevTop = el.scrollTop;
      await loadOlder();
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight - prevHeight + prevTop;
      });
    }
  }, [hasMore, loadingOlder, loadOlder]);

  const onDelete = async (message) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await remove(message._id);
    } catch (err) {
      toast({ type: "error", title: "Could not delete message", body: apiMessage(err) });
    }
  };

  const onTogglePin = async (message) => {
    try {
      await togglePin(message);
    } catch (err) {
      toast({ type: "error", title: "Pin failed", body: apiMessage(err) });
    }
  };

  const onEdit = async (messageId, content) => {
    try {
      await edit(messageId, content);
    } catch (err) {
      toast({ type: "error", title: "Could not edit message", body: apiMessage(err) });
      throw err;
    }
  };

  const onToggleReaction = async (message, emoji) => {
    try {
      await toggleReaction(message, emoji);
    } catch (err) {
      toast({ type: "error", title: "Reaction failed", body: apiMessage(err) });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-cream-50">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto pb-4"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size={22} />
          </div>
        ) : error ? (
          <EmptyState icon={MessageSquare} title="Could not load messages" body={error} className="h-full" />
        ) : messages.length === 0 ? (
          <EmptyState icon={MessageSquare} title={emptyTitle} body={emptyBody} className="h-full" />
        ) : (
          <>
            {loadingOlder && (
              <div className="flex justify-center py-3">
                <Spinner size={16} />
              </div>
            )}
            {!hasMore && (
              <p className="px-4 pt-6 pb-1 text-center text-[11px] text-ink-300">
                This is the beginning of the conversation.
              </p>
            )}
            {messages.map((message, i) => {
              const prev = messages[i - 1];
              const newDay = !prev || dayKey(prev.createdAt) !== dayKey(message.createdAt);
              return (
                <div key={message._id}>
                  {newDay && <DayDivider date={message.createdAt} />}
                  <MessageItem
                    message={message}
                    grouped={!newDay && isGrouped(message, prev)}
                    viewerId={idOf(user?._id)}
                    isMine={idOf(message.authorId) === String(user?._id)}
                    canManage={canManage}
                    canPin={canPin}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onTogglePin={onTogglePin}
                    onToggleReaction={onToggleReaction}
                    onStartThread={onStartThread}
                    onVotePoll={onVotePoll}
                    onOpenPollVoters={onOpenPollVoters}
                    onEditPoll={onEditPoll}
                  />
                </div>
              );
            })}
          </>
        )}
      </div>

      <TypingIndicator typers={typers} />
      <Composer
        placeholder={placeholder}
        disabled={!canSend}
        disabledHint={sendDisabledHint}
        onSend={send}
        onSummarize={onSummarize}
        onTyping={notifyTyping}
        onStopTyping={stopTyping}
      />
    </div>
  );
};
