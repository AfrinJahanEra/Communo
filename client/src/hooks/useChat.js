import { useCallback, useEffect, useRef, useState } from "react";
import { emitAck } from "../lib/socket";
import { idOf } from "../lib/utils";
import { apiMessage } from "../lib/api";
import {
  listChannelMessages,
  sendChannelMessage,
} from "../services/channelService";
import { listThreadMessages } from "../services/threadService";
import {
  listDmMessages,
  sendDmMessage,
  updateDmMessage,
  deleteDmMessage,
  toggleDmMessageReaction,
} from "../services/dmService";
import {
  updateMessage,
  deleteMessage,
  pinMessage,
  unpinMessage,
  toggleMessageReaction,
  votePoll,
  editPoll,
} from "../services/messageService";
import api from "../lib/api";
import { useSocketEvent } from "./useSocket";

const PAGE_SIZE = 50;

/**
 * Per-scope wiring: how to fetch, send, join rooms and match socket events
 * for the three chat surfaces (channel, thread, DM). All three share the
 * same message shape and cursor pagination contract.
 */
const SCOPES = {
  channel: {
    fetch: (id, params) => listChannelMessages(id, params),
    joinEvent: "channel:join",
    leaveEvent: "channel:leave",
    joinPayload: (id) => ({ channelId: id }),
    sendEvent: "message:send",
    sendPayload: (id, content, attachments, poll) => ({
      channelId: id,
      content,
      attachments,
      ...(poll ? { poll } : {}),
    }),
    restSend: (id, content, attachments, poll) => sendChannelMessage(id, content, attachments, poll),
    newEvent: "message:new",
    updatedEvent: "message:updated",
    deletedEvent: "message:deleted",
    matches: (id, m) => idOf(m.channelId) === id && !m.threadId,
    matchesDeleted: (id, p) => idOf(p.channelId) === id && !p.threadId,
    typingEmit: (id, isTyping) => [isTyping ? "typing:start" : "typing:stop", { channelId: id }],
    typingEvent: "typing",
    typingMatches: (id, p) => idOf(p.channelId) === id && !p.threadId,
    edit: (messageId, content) => updateMessage(messageId, content),
    remove: (messageId) => deleteMessage(messageId),
    pin: (messageId) => pinMessage(messageId),
    unpin: (messageId) => unpinMessage(messageId),
    react: (messageId, emoji) => toggleMessageReaction(messageId, emoji),
  },
  thread: {
    fetch: (id, params) => listThreadMessages(id, params),
    joinEvent: "thread:join",
    leaveEvent: "thread:leave",
    joinPayload: (id) => ({ threadId: id }),
    sendEvent: "message:send",
    sendPayload: (id, content, attachments) => ({ threadId: id, content, attachments }),
    restSend: async (id, content, attachments) => {
      const { data } = await api.post(`/threads/${id}/messages`, { content, attachments });
      return data.message;
    },
    newEvent: "message:new",
    updatedEvent: "message:updated",
    deletedEvent: "message:deleted",
    matches: (id, m) => idOf(m.threadId) === id,
    matchesDeleted: (id, p) => idOf(p.threadId) === id,
    typingEmit: (id, isTyping) => [isTyping ? "typing:start" : "typing:stop", { threadId: id }],
    typingEvent: "typing",
    typingMatches: (id, p) => idOf(p.threadId) === id,
    edit: (messageId, content) => updateMessage(messageId, content),
    remove: (messageId) => deleteMessage(messageId),
    pin: (messageId) => pinMessage(messageId),
    unpin: (messageId) => unpinMessage(messageId),
    react: (messageId, emoji) => toggleMessageReaction(messageId, emoji),
  },
  dm: {
    fetch: (id, params) => listDmMessages(id, params),
    joinEvent: null, // DM events arrive via the personal user room
    sendEvent: "dm:send",
    sendPayload: (id, content, attachments) => ({ dmId: id, content, attachments }),
    restSend: (id, content, attachments) => sendDmMessage(id, content, attachments),
    newEvent: "dm:new",
    updatedEvent: "dm:updated",
    deletedEvent: "dm:deleted",
    matches: (id, m) => idOf(m.dmId) === id,
    matchesDeleted: (id, p) => idOf(p.dmId) === id,
    typingEmit: (id, isTyping) => ["dm:typing", { dmId: id, isTyping }],
    typingEvent: "dm:typing",
    typingMatches: (id, p) => idOf(p.dmId) === id,
    edit: (messageId, content) => updateDmMessage(messageId, content),
    remove: (messageId) => deleteDmMessage(messageId),
    pin: null,
    unpin: null,
    react: (messageId, emoji) => toggleDmMessageReaction(messageId, emoji),
  },
};

/**
 * Real-time message state for one chat scope (kind: "channel"|"thread"|"dm").
 * Messages are kept oldest → newest for rendering; the API serves newest
 * first with `before` (message id) cursor pagination.
 */
export const useChat = (kind, id) => {
  const cfg = SCOPES[kind];
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState(null);
  const [typers, setTypers] = useState({}); // userId -> username
  const typingTimers = useRef({});

  // Reset synchronously (during render) when the scope changes, so the old
  // conversation never flashes while the new one loads.
  const scopeKey = id ? `${kind}:${id}` : null;
  const [prevScopeKey, setPrevScopeKey] = useState(scopeKey);
  if (scopeKey !== prevScopeKey) {
    setPrevScopeKey(scopeKey);
    setMessages([]);
    setCursor(null);
    setTypers({});
    setError("");
    setLoading(true);
  }

  // ---- initial load / scope switch ----
  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    cfg
      .fetch(id, { limit: PAGE_SIZE })
      .then(({ messages: page, nextCursor }) => {
        if (!alive) return;
        setMessages([...page].reverse());
        setCursor(nextCursor);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setError(apiMessage(err, "Could not load messages"));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [kind, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- room membership (channels/threads only) ----
  const joinEvent = cfg.joinEvent;
  useEffect(() => {
    if (!id || !joinEvent) return undefined;
    let joined = false;
    emitAck(joinEvent, cfg.joinPayload(id)).then((ack) => {
      joined = ack.success;
    });
    return () => {
      if (joined) emitAck(cfg.leaveEvent, cfg.joinPayload(id));
    };
  }, [id, joinEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- live updates ----
  const upsert = useCallback((message) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m._id === message._id);
      if (idx === -1) return [...prev, message];
      const next = [...prev];
      next[idx] = message;
      return next;
    });
  }, []);

  useSocketEvent(
    cfg.newEvent,
    ({ message }) => {
      if (cfg.matches(id, message)) upsert(message);
    },
    [id, upsert]
  );

  useSocketEvent(
    cfg.updatedEvent,
    ({ message }) => {
      if (cfg.matches(id, message)) upsert(message);
    },
    [id, upsert]
  );

  useSocketEvent(
    cfg.deletedEvent,
    (payload) => {
      if (cfg.matchesDeleted(id, payload)) {
        setMessages((prev) => prev.filter((m) => m._id !== idOf(payload.messageId)));
      }
    },
    [id]
  );

  // pin state changes reuse the updated handler shape
  useSocketEvent(
    "message:pinned",
    ({ message }) => {
      if (kind !== "dm" && cfg.matches(id, message)) upsert(message);
    },
    [id, kind, upsert]
  );
  useSocketEvent(
    "message:unpinned",
    ({ message }) => {
      if (kind !== "dm" && cfg.matches(id, message)) upsert(message);
    },
    [id, kind, upsert]
  );

  // ---- typing indicators ----
  useSocketEvent(
    cfg.typingEvent,
    (payload) => {
      if (!cfg.typingMatches(id, payload)) return;
      const userId = idOf(payload.userId);
      clearTimeout(typingTimers.current[userId]);
      if (payload.isTyping) {
        setTypers((prev) => ({ ...prev, [userId]: payload.username }));
        // safety net in case typing:stop is lost
        typingTimers.current[userId] = setTimeout(() => {
          setTypers((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }, 8000);
      } else {
        setTypers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    },
    [id]
  );

  useEffect(() => {
    const timers = typingTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, [id]);

  // ---- actions ----
  const loadOlder = useCallback(async () => {
    if (!cursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const { messages: page, nextCursor } = await cfg.fetch(id, {
        before: cursor,
        limit: PAGE_SIZE,
      });
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m._id));
        return [...[...page].reverse().filter((m) => !known.has(m._id)), ...prev];
      });
      setCursor(nextCursor);
    } finally {
      setLoadingOlder(false);
    }
  }, [cursor, loadingOlder, id]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Socket first (instant broadcast), REST fallback when the socket is down. */
  const send = useCallback(
    async (content, attachments = [], poll = null) => {
      const [event, payload] = [cfg.sendEvent, cfg.sendPayload(id, content, attachments, poll)];
      const ack = await emitAck(event, payload);
      if (ack.success) {
        if (ack.message && typeof ack.message === "object") upsert(ack.message);
        return;
      }
      if (ack.message === "Not connected" || ack.message === "Request timed out") {
        const message = await cfg.restSend(id, content, attachments, poll);
        upsert(message);
        return;
      }
      throw new Error(ack.message || "Could not send the message");
    },
    [id, upsert] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const edit = useCallback(
    async (messageId, content) => {
      const message = await cfg.edit(messageId, content);
      upsert(message);
    },
    [upsert] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const remove = useCallback(
    async (messageId) => {
      await cfg.remove(messageId);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const togglePin = useCallback(
    async (message) => {
      if (!cfg.pin) return;
      const updated = message.pinned
        ? await cfg.unpin(message._id)
        : await cfg.pin(message._id);
      upsert(updated);
    },
    [upsert] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const toggleReaction = useCallback(
    async (message, emoji) => {
      const updated = await cfg.react(message._id, emoji);
      upsert(updated);
    },
    [upsert] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Polls are channel-only, so these call the message service directly
  // rather than routing through the per-scope cfg table.
  const votePollAction = useCallback(
    async (messageId, optionId) => {
      const updated = await votePoll(messageId, optionId);
      upsert(updated);
      return updated;
    },
    [upsert]
  );

  const editPollAction = useCallback(
    async (messageId, pollPayload) => {
      const updated = await editPoll(messageId, pollPayload);
      upsert(updated);
      return updated;
    },
    [upsert]
  );

  /** Debounced typing broadcast — call on every keystroke. */
  const typingActive = useRef(false);
  const typingStopTimer = useRef(null);
  const notifyTyping = useCallback(() => {
    if (!id) return;
    if (!typingActive.current) {
      typingActive.current = true;
      const [event, payload] = cfg.typingEmit(id, true);
      emitAck(event, payload);
    }
    clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      typingActive.current = false;
      const [event, payload] = cfg.typingEmit(id, false);
      emitAck(event, payload);
    }, 2500);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopTyping = useCallback(() => {
    clearTimeout(typingStopTimer.current);
    if (typingActive.current) {
      typingActive.current = false;
      const [event, payload] = cfg.typingEmit(id, false);
      emitAck(event, payload);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    messages,
    loading,
    loadingOlder,
    error,
    hasMore: Boolean(cursor),
    typers,
    loadOlder,
    send,
    edit,
    remove,
    togglePin,
    toggleReaction,
    votePoll: votePollAction,
    editPoll: editPollAction,
    canPin: Boolean(cfg.pin),
    notifyTyping,
    stopTyping,
  };
};

