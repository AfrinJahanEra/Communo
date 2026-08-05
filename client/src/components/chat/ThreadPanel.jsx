import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Lock,
  LockOpen,
  MessagesSquare,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Spinner } from "../ui/Spinner";
import { Menu } from "../ui/Menu";
import { ChatPane } from "./ChatPane";
import { useAuth } from "../../hooks/useAuth";
import { useChat } from "../../hooks/useChat";
import { useToast } from "../../hooks/useToast";
import { apiMessage } from "../../lib/api";
import { cn, idOf, timeAgo } from "../../lib/utils";
import { hasPermission, PERMISSIONS } from "../../lib/permissions";
import { createThread, listChannelThreads } from "../../services/channelService";
import * as threadService from "../../services/threadService";
import { MoreVertical } from "lucide-react";

// ---------- single thread chat ----------

const ThreadView = ({ thread, myPermissions, onBack, onThreadChanged, onDeleted }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const chat = useChat("thread", thread._id);

  const isCreator = idOf(thread.createdBy) === String(user?._id);
  // const canManageThreads = hasPermission(myPermissions, PERMISSIONS.MANAGE_THREADS);
  const canManageThisThread = isCreator;
  const canSend =
    !thread.archived &&
    (!thread.locked || isCreator) &&
    hasPermission(myPermissions, PERMISSIONS.SEND_MESSAGES);

  const act = async (fn, successTitle) => {
    try {
      const updated = await fn(thread._id);
      toast({ type: "success", title: successTitle });
      onThreadChanged(updated ?? null);
    } catch (err) {
      toast({ type: "error", title: "Action failed", body: apiMessage(err) });
    }
  };

  const onDelete = async () => {
    if (!window.confirm(`Delete thread "${thread.name}" and all its messages?`)) return;
    try {
      await threadService.deleteThread(thread._id);
      toast({ type: "success", title: "Thread deleted" });
      onDeleted();
    } catch (err) {
      toast({ type: "error", title: "Could not delete thread", body: apiMessage(err) });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-cream-300 px-2.5">
        <button onClick={onBack} className="rounded-lg p-1.5 text-ink-500 transition hover:bg-cream-200">
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink-900">{thread.name}</p>
          <p className="flex items-center gap-1.5 text-[10px] text-ink-300">
            {thread.archived && (
              <span className="flex items-center gap-0.5"><Archive size={10} /> resolved</span>
            )}
            {thread.locked && (
              <span className="flex items-center gap-0.5"><Lock size={10} /> locked</span>
            )}
            {!thread.archived && !thread.locked && `active ${timeAgo(thread.lastActiveAt)}`}
          </p>
        </div>
        {canManageThisThread && (
          <Menu
            trigger={({ toggle }) => (
              <button onClick={toggle} className="rounded-lg p-1.5 text-ink-500 transition hover:bg-cream-200">
                <MoreVertical size={16} />
              </button>
            )}
            items={[
              canManageThisThread && !thread.archived && {
                label: "Resolve thread",
                icon: Archive,
                onClick: () => act(threadService.archiveThread, "Thread resolved"),
              },
              canManageThisThread && thread.archived && {
                label: "Reopen thread",
                icon: ArchiveRestore,
                onClick: () => act(threadService.unarchiveThread, "Thread reopened"),
              },
              canManageThisThread && !thread.locked && {
                label: "Lock thread",
                icon: Lock,
                onClick: () => act(threadService.lockThread, "Thread locked"),
              },
              canManageThisThread && thread.locked && {
                label: "Unlock thread",
                icon: LockOpen,
                onClick: () => act(threadService.unlockThread, "Thread unlocked"),
              },
              canManageThisThread && { divider: true },
              canManageThisThread && { label: "Delete thread", icon: Trash2, danger: true, onClick: onDelete },
            ]}
          />
        )}
      </div>

      <ChatPane
        chat={chat}
        placeholder={`Reply in "${thread.name}"`}
        canManage={hasPermission(myPermissions, PERMISSIONS.MANAGE_MESSAGES)}
        canPin={hasPermission(myPermissions, PERMISSIONS.MANAGE_MESSAGES)}
        canSend={canSend}
        sendDisabledHint={
          thread.archived
            ? "This thread is resolved and read-only."
            : "This thread is locked by the creator."
        }
        emptyTitle="No replies yet"
        emptyBody="Start the discussion below."
      />
    </div>
  );
};

// ---------- thread list ----------

const ThreadListItem = ({ thread, onOpen }) => (
  <button
    onClick={() => onOpen(thread)}
    className="w-full rounded-xl border border-cream-300 bg-white p-3 text-left transition hover:border-lav-300 hover:shadow-sm"
  >
    <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink-900">
      {thread.locked && <Lock size={12} className="shrink-0 text-ink-300" />}
      {thread.name}
    </p>
    <p className="mt-0.5 text-[11px] text-ink-300">
      {thread.participantIds?.length ?? 0} participant{(thread.participantIds?.length ?? 0) === 1 ? "" : "s"} · active {timeAgo(thread.lastActiveAt)}
    </p>
  </button>
);

/**
 * Right-hand threads panel for a channel: browse active/archived threads,
 * create one (optionally from a message) and open a thread conversation.
 */
export const ThreadPanel = ({ channel, myPermissions, startFromMessage, onClose }) => {
  const { toast } = useToast();
  const [threads, setThreads] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [openThread, setOpenThread] = useState(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(null); // { name, parentMessageId }

  const canCreate =
    channel.type === "announcement"
      ? hasPermission(myPermissions, PERMISSIONS.MANAGE_THREADS)
      : hasPermission(myPermissions, PERMISSIONS.SEND_MESSAGES);

  const refresh = useCallback(() => {
    listChannelThreads(channel._id, { archived: showArchived })
      .then(setThreads)
      .catch(() => {});
  }, [channel._id, showArchived]);

  useEffect(() => {
    let alive = true;
    listChannelThreads(channel._id, { archived: showArchived })
      .then((list) => alive && setThreads(list))
      .catch(() => alive && setThreads([]));
    return () => {
      alive = false;
    };
  }, [channel._id, showArchived]);

  // Reset to the loading state during render when the list scope changes.
  const listKey = `${channel._id}:${showArchived}`;
  const [prevListKey, setPrevListKey] = useState(listKey);
  if (listKey !== prevListKey) {
    setPrevListKey(listKey);
    setThreads(null);
  }

  // "Reply in thread" from a message pre-fills the create form.
  const startKey = startFromMessage?._id;
  const [prevStartKey, setPrevStartKey] = useState(null);
  if (startKey && startKey !== prevStartKey) {
    setPrevStartKey(startKey);
    setOpenThread(null);
    setDraft({
      name: (startFromMessage.content || "").replace(/```[\s\S]*?```/g, "").trim().slice(0, 60) || "New thread",
      parentMessageId: startFromMessage._id,
    });
  }

  const submitCreate = async (e) => {
    e.preventDefault();
    const name = draft?.name?.trim();
    if (!name) return;
    setCreating(true);
    try {
      const thread = await createThread(channel._id, {
        name,
        parentMessageId: draft.parentMessageId ?? null,
      });
      setDraft(null);
      setOpenThread(thread);
      refresh();
    } catch (err) {
      toast({ type: "error", title: "Could not create thread", body: apiMessage(err) });
    } finally {
      setCreating(false);
    }
  };

  const body = useMemo(() => {
    if (openThread) {
      return (
        <ThreadView
          thread={openThread}
          myPermissions={myPermissions}
          onBack={() => {
            setOpenThread(null);
            refresh();
          }}
          onThreadChanged={(updated) => {
            if (updated) setOpenThread(updated);
            refresh();
          }}
          onDeleted={() => {
            setOpenThread(null);
            refresh();
          }}
        />
      );
    }
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-cream-300 px-4">
          <MessagesSquare size={16} className="text-lav-600" />
          <p className="flex-1 text-sm font-bold text-ink-900">Threads</p>
          {canCreate && (
            <button
              onClick={() => setDraft((d) => (d ? null : { name: "", parentMessageId: null }))}
              title="New thread"
              className="rounded-lg p-1.5 text-ink-500 transition hover:bg-lav-100 hover:text-lav-700"
            >
              <Plus size={16} />
            </button>
          )}
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-500 transition hover:bg-cream-200">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {draft && (
            <form onSubmit={submitCreate} className="space-y-2 rounded-xl border border-lav-300 bg-lav-50 p-3">
              <p className="text-xs font-bold text-lav-800">
                {draft.parentMessageId ? "New thread from message" : "New thread"}
              </p>
              <Input
                autoFocus
                placeholder="Thread name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                maxLength={100}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={creating}>
                  Create
                </Button>
              </div>
            </form>
          )}

          <div className="flex gap-1 rounded-lg bg-cream-100 p-0.5">
            {[false, true].map((archived) => (
              <button
                key={String(archived)}
                onClick={() => setShowArchived(archived)}
                className={cn(
                  "flex-1 rounded-md py-1 text-[11px] font-semibold transition",
                  showArchived === archived ? "bg-white text-ink-900 shadow-sm" : "text-ink-300"
                )}
              >
                {archived ? "Resolved" : "Active"}
              </button>
            ))}
          </div>

          {threads === null ? (
            <div className="flex justify-center py-8">
              <Spinner size={18} />
            </div>
          ) : threads.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-ink-300">
              {showArchived ? "No archived threads." : "No active threads — start one from a message or with +."}
            </p>
          ) : (
            threads.map((t) => <ThreadListItem key={t._id} thread={t} onOpen={setOpenThread} />)
          )}
        </div>
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openThread, threads, draft, creating, showArchived, canCreate, myPermissions]);

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-[min(24rem,100vw)] flex-col border-l border-cream-300 bg-cream-50 shadow-xl animate-slide-up md:static md:z-auto md:w-96 md:animate-none md:shadow-none">
      {body}
    </aside>
  );
};
