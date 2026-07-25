import { useEffect, useRef, useState } from "react";
import {
  Bot,
  MessageSquarePlus,
  MoreHorizontal,
  Paperclip,
  Pencil,
  SendHorizonal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";
import { Button } from "../ui/Button";
import { Select, TextArea } from "../ui/Input";
import { Menu } from "../ui/Menu";
import { Spinner } from "../ui/Spinner";
import { useClickOutside } from "../../hooks/useClickOutside";
import { useToast } from "../../hooks/useToast";
import { apiMessage } from "../../lib/api";
import { cn, formatTime, idOf } from "../../lib/utils";
import * as aiService from "../../services/aiService";

/**
 * Right panel of the AI Study page: Groq-backed doubt solver. Conversations
 * are private to the user and scoped to this server so its shared resources
 * (≤3 per question) can be attached as context.
 */

const STARTERS = [
  "Explain time complexity with simple examples",
  "Debug my code: paste it and I'll help",
  "Summarize the attached PDF",
  "How does a hash map work internally?",
];

const FOLLOW_UPS = [
  "Explain it step by step",
  "Show a code example",
  "Simplify the explanation",
  "Give me practice questions",
];

const NEW_CHAT = "__new__";

/** Locally-rendered user message shown while the backend turn is in flight. */
const makeOptimistic = (content) => ({
  _id: `tmp-${Date.now()}`,
  role: "user",
  content,
  createdAt: new Date().toISOString(),
});

// ---------- message bubbles ----------

const UserBubble = ({ message }) => (
  <div className="flex justify-end">
    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-lav-600 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white shadow-sm">
      <p className="whitespace-pre-wrap break-words">{message.content}</p>
    </div>
  </div>
);

const AssistantBubble = ({ message }) => (
  <div className="flex gap-2.5">
    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-lav-100 text-lav-600">
      <Sparkles size={14} />
    </span>
    <div className="min-w-0 max-w-[88%] rounded-2xl rounded-tl-md border border-cream-300 bg-white px-3.5 py-2.5 shadow-sm">
      <MarkdownContent>{message.content}</MarkdownContent>
      {message.createdAt && (
        <p className="mt-1.5 text-right text-[10px] text-ink-300">{formatTime(message.createdAt)}</p>
      )}
    </div>
  </div>
);

const ThinkingBubble = () => (
  <div className="flex gap-2.5">
    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-lav-100 text-lav-600">
      <Sparkles size={14} />
    </span>
    <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-cream-300 bg-white px-4 py-3.5 shadow-sm">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-lav-500"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  </div>
);

// ---------- resource attach picker ----------

const AttachPicker = ({ resources, selected, onToggle, onClose }) => {
  const ref = useClickOutside(onClose, true);
  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 z-30 mb-2 max-h-56 w-72 overflow-y-auto rounded-xl border border-cream-300 bg-white py-1 shadow-lg animate-pop"
    >
      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-300">
        Attach context (max 3)
      </p>
      {resources.length === 0 ? (
        <p className="px-3 py-2 text-xs text-ink-500">
          No resources in this server yet — upload a PDF on the left first.
        </p>
      ) : (
        resources.map((r) => {
          const id = idOf(r._id);
          const checked = selected.includes(id);
          return (
            <button
              key={id}
              onClick={() => onToggle(id)}
              disabled={!checked && selected.length >= 3}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition disabled:opacity-40",
                checked ? "bg-lav-50 text-lav-800" : "text-ink-700 hover:bg-cream-100"
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px] font-bold",
                  checked ? "border-lav-500 bg-lav-500 text-white" : "border-ink-300/50"
                )}
              >
                {checked && "✓"}
              </span>
              <span className="truncate">{r.title}</span>
              {r.textStatus === "done" && (
                <span className="ml-auto shrink-0 rounded-full bg-status-online/10 px-1.5 py-px text-[9px] font-bold text-status-online">
                  readable
                </span>
              )}
            </button>
          );
        })
      )}
    </div>
  );
};

// ---------- panel ----------

export const AiChatPanel = ({ serverId, resources }) => {
  const { toast } = useToast();
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activeId, setActiveId] = useState(null); // null = fresh draft chat
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attachIds, setAttachIds] = useState([]);
  const [attachOpen, setAttachOpen] = useState(false);

  // Reset synchronously when switching servers
  const [prevServerId, setPrevServerId] = useState(serverId);
  if (serverId !== prevServerId) {
    setPrevServerId(serverId);
    setConversations([]);
    setLoadingConvs(true);
    setActiveId(null);
    setMessages([]);
    setInput("");
    setAttachIds([]);
  }

  // Swap the transcript synchronously when the conversation changes
  const [prevActiveId, setPrevActiveId] = useState(activeId);
  if (activeId !== prevActiveId) {
    setPrevActiveId(activeId);
    setMessages([]);
    setLoadingMessages(Boolean(activeId));
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const all = await aiService.listConversations();
        if (!alive) return;
        const scoped = all.filter((c) => idOf(c.serverId) === serverId);
        setConversations(scoped);
        if (scoped.length) setActiveId(idOf(scoped[0]._id));
      } catch (err) {
        if (alive) toast({ type: "error", title: "Couldn't load conversations", body: apiMessage(err) });
      } finally {
        if (alive) setLoadingConvs(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  useEffect(() => {
    if (!activeId) return undefined;
    let alive = true;
    (async () => {
      try {
        const { messages: history } = await aiService.getConversationMessages(activeId);
        if (alive) setMessages(history);
      } catch (err) {
        if (alive) toast({ type: "error", title: "Couldn't load messages", body: apiMessage(err) });
      } finally {
        if (alive) setLoadingMessages(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    setSending(true);
    setInput("");
    const optimistic = makeOptimistic(content);
    setMessages((m) => [...m, optimistic]);
    try {
      let convId = activeId;
      if (!convId) {
        const conv = await aiService.createConversation({ serverId });
        convId = idOf(conv._id);
        setConversations((list) => [conv, ...list]);
        setActiveId(convId);
      }
      const res = await aiService.sendMessage(convId, content, attachIds);
      setMessages((m) => [
        ...m.filter((x) => x._id !== optimistic._id),
        res.userMessage,
        res.assistantMessage,
      ]);
      setConversations((list) => [
        res.conversation,
        ...list.filter((c) => idOf(c._id) !== convId),
      ]);
      setAttachIds([]);
    } catch (err) {
      setMessages((m) => m.filter((x) => x._id !== optimistic._id));
      setInput(content);
      toast({ type: "error", title: "The AI couldn't respond", body: apiMessage(err) });
    } finally {
      setSending(false);
    }
  };

  const startNewChat = () => {
    setActiveId(null);
    setMessages([]);
    setAttachIds([]);
    inputRef.current?.focus();
  };

  const renameActive = async () => {
    const current = conversations.find((c) => idOf(c._id) === activeId);
    const title = window.prompt("Conversation title", current?.title || "");
    if (!title?.trim()) return;
    try {
      const updated = await aiService.renameConversation(activeId, title.trim());
      setConversations((list) =>
        list.map((c) => (idOf(c._id) === activeId ? updated : c))
      );
    } catch (err) {
      toast({ type: "error", title: "Rename failed", body: apiMessage(err) });
    }
  };

  const deleteActive = async () => {
    if (!window.confirm("Delete this conversation and its history?")) return;
    try {
      await aiService.deleteConversation(activeId);
      setConversations((list) => list.filter((c) => idOf(c._id) !== activeId));
      startNewChat();
    } catch (err) {
      toast({ type: "error", title: "Delete failed", body: apiMessage(err) });
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const attached = attachIds
    .map((id) => resources.find((r) => idOf(r._id) === id))
    .filter(Boolean);
  const lastMessage = messages[messages.length - 1];
  const showFollowUps = !sending && lastMessage?.role === "assistant";
  const empty = !loadingMessages && messages.length === 0 && !sending;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-cream-300 px-3 py-2">
        <Bot size={17} className="shrink-0 text-lav-600" />
        <Select
          value={activeId || NEW_CHAT}
          onChange={(e) => (e.target.value === NEW_CHAT ? startNewChat() : setActiveId(e.target.value))}
          disabled={loadingConvs}
          className="min-w-0 flex-1 rounded-lg py-1.5 text-[13px]"
          aria-label="Conversation"
        >
          <option value={NEW_CHAT}>✦ New conversation</option>
          {conversations.map((c) => (
            <option key={idOf(c._id)} value={idOf(c._id)}>
              {c.title}
            </option>
          ))}
        </Select>
        <button
          onClick={startNewChat}
          className="rounded-lg p-2 text-ink-500 transition hover:bg-lav-100 hover:text-lav-700"
          title="New conversation"
        >
          <MessageSquarePlus size={16} />
        </button>
        {activeId && (
          <Menu
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className="rounded-lg p-2 text-ink-500 transition hover:bg-cream-200 hover:text-ink-700"
                aria-label="Conversation actions"
              >
                <MoreHorizontal size={16} />
              </button>
            )}
            items={[
              { label: "Rename", icon: Pencil, onClick: renameActive },
              { label: "Delete conversation", icon: Trash2, danger: true, onClick: deleteActive },
            ]}
          />
        )}
      </div>

      {/* messages */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-cream-100/50 p-3 sm:p-4">
        {loadingMessages || loadingConvs ? (
          <div className="flex justify-center py-10">
            <Spinner size={22} />
          </div>
        ) : empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lav-100 text-lav-500">
              <Sparkles size={26} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-700">Ask me anything</p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-ink-500">
                Programming doubts, debugging, algorithms, or questions about the PDFs shared in
                this server.
              </p>
            </div>
            <div className="mt-1 flex max-w-sm flex-wrap justify-center gap-1.5">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-lav-300 bg-white px-3 py-1.5 text-xs font-medium text-lav-700 transition hover:bg-lav-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) =>
              message.role === "user" ? (
                <UserBubble key={idOf(message._id)} message={message} />
              ) : (
                <AssistantBubble key={idOf(message._id)} message={message} />
              )
            )}
            {sending && <ThinkingBubble />}
            {showFollowUps && (
              <div className="flex flex-wrap gap-1.5 pl-9">
                {FOLLOW_UPS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-lav-200 bg-white px-2.5 py-1 text-[11px] font-medium text-lav-700 transition hover:border-lav-400 hover:bg-lav-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <div className="relative shrink-0 border-t border-cream-300 bg-cream-50 p-3">
        {attachOpen && (
          <AttachPicker
            resources={resources}
            selected={attachIds}
            onToggle={(id) =>
              setAttachIds((ids) =>
                ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
              )
            }
            onClose={() => setAttachOpen(false)}
          />
        )}

        {attached.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attached.map((r) => (
              <span
                key={idOf(r._id)}
                className="flex items-center gap-1 rounded-full bg-lav-100 py-1 pl-2.5 pr-1.5 text-[11px] font-semibold text-lav-800"
              >
                <Paperclip size={10} />
                <span className="max-w-36 truncate">{r.title}</span>
                <button
                  onClick={() =>
                    setAttachIds((ids) => ids.filter((x) => x !== idOf(r._id)))
                  }
                  className="rounded-full p-0.5 hover:bg-lav-300/50"
                  aria-label={`Remove ${r.title}`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            onClick={() => setAttachOpen((o) => !o)}
            onMouseDown={(e) => e.stopPropagation()}
            className={cn(
              "shrink-0 rounded-xl p-2.5 transition",
              attachIds.length
                ? "bg-lav-100 text-lav-700"
                : "text-ink-500 hover:bg-cream-200 hover:text-ink-900"
            )}
            title="Attach a resource as context"
          >
            <Paperclip size={16} />
          </button>
          <TextArea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask a doubt… (Enter to send, Shift+Enter for a new line)"
            rows={input.includes("\n") ? 3 : 1}
            maxLength={8000}
            className="max-h-32 min-h-0 flex-1 rounded-xl py-2.5 text-[13.5px]"
          />
          <Button
            onClick={() => send()}
            loading={sending}
            disabled={!input.trim()}
            className="shrink-0 rounded-xl px-3.5 py-2.5"
            aria-label="Send"
          >
            <SendHorizonal size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};
