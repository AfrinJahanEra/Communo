import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, MessageSquarePlus, Pencil, Pin, PinOff, SmilePlus, Trash2 } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { CodeBlock } from "./CodeBlock";
import { AttachmentImageLightbox } from "./AttachmentImageLightbox";
import { cn, displayNameOf, formatBytes, formatTime, parseContent, splitLinks } from "../../lib/utils";

const REACTION_PRESETS = ["👍", "❤️", "😂", "🔥", "🎉", "🤯"];

/** Same-origin links (e.g. invite links) navigate in-app; others open a new tab. */
const ContentLink = ({ url }) => {
  const navigate = useNavigate();
  const isInternal = url.startsWith(window.location.origin);

  return (
    <a
      href={url}
      target={isInternal ? undefined : "_blank"}
      rel={isInternal ? undefined : "noopener noreferrer"}
      onClick={(e) => {
        if (!isInternal) return;
        e.preventDefault();
        navigate(url.slice(window.location.origin.length) || "/");
      }}
      className="break-all font-medium text-lav-600 underline decoration-lav-300 underline-offset-2 transition hover:text-lav-800 hover:decoration-lav-500"
    >
      {url}
    </a>
  );
};

const MessageContent = ({ content }) => (
  <div className="min-w-0 text-[14px] leading-relaxed text-ink-900">
    {parseContent(content).map((seg, i) =>
      seg.type === "code" ? (
        <CodeBlock key={i} lang={seg.lang} code={seg.value} />
      ) : (
        <span key={i} className="whitespace-pre-wrap break-words">
          {splitLinks(seg.value).map((part, j) =>
            part.type === "link" ? (
              <ContentLink key={j} url={part.value} />
            ) : (
              part.value
            )
          )}
        </span>
      )
    )}
  </div>
);

const MessageAttachments = ({ attachments, onPreviewImage }) => (
  <div className="mt-1.5 flex flex-wrap gap-2">
    {attachments.map((att) =>
      att.resourceType === "image" ? (
        <button
          key={att.publicId}
          type="button"
          onClick={() => onPreviewImage(att)}
          className="block overflow-hidden rounded-xl border border-cream-300 transition hover:opacity-90"
        >
          <img src={att.url} alt={att.originalName} className="max-h-64 max-w-xs object-cover" />
        </button>
      ) : (
        <a
          key={att.publicId}
          href={att.url}
          target="_blank"
          rel="noreferrer"
          download={att.originalName}
          className="flex max-w-xs items-center gap-2 rounded-xl border border-cream-300 bg-white px-3 py-2 transition hover:border-lav-300 hover:shadow-sm"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lav-100 text-lav-700">
            <FileText size={16} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-ink-900">{att.originalName}</span>
            <span className="block text-[11px] text-ink-300">{formatBytes(att.sizeBytes)}</span>
          </span>
        </a>
      )
    )}
  </div>
);

const ActionButton = ({ icon: Icon, label, danger, onClick }) => (
  <button
    onClick={onClick}
    title={label}
    className={cn(
      "rounded-lg p-1.5 transition",
      danger
        ? "text-ink-300 hover:bg-status-dnd/10 hover:text-status-dnd"
        : "text-ink-300 hover:bg-lav-100 hover:text-lav-700"
    )}
  >
    <Icon size={14} />
  </button>
);

/**
 * One chat message row with hover actions (edit / pin / delete / thread)
 * and inline editing. Grouped rows hide the avatar + author line.
 */
export const MessageItem = ({
  message,
  grouped,
  viewerId,
  isMine,
  canManage, // MANAGE_MESSAGES holders can delete/pin others' messages
  canPin,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleReaction,
  onStartThread,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const author = typeof message.authorId === "object" ? message.authorId : null;
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];

  const startEdit = () => {
    setDraft(message.content);
    setEditing(true);
  };

  const submitEdit = async () => {
    const content = draft.trim();
    if (!content || content === message.content) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await onEdit(message._id, content);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const onEditKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitEdit();
    }
    if (e.key === "Escape") setEditing(false);
  };

  const reactions = Array.isArray(message.reactions) ? message.reactions : [];

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-0.5 transition hover:bg-cream-200/50",
        !grouped && "mt-3",
        message.pinned && "border-l-2 border-lav-400 bg-lav-50/60"
      )}
    >
      {grouped ? (
        <span className="w-10 shrink-0 pt-1 text-right text-[10px] leading-5 text-ink-300 opacity-0 transition group-hover:opacity-100">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ) : (
        <Avatar user={author} size="md" className="mt-0.5" />
      )}

      <div className="min-w-0 flex-1">
        {!grouped && (
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-bold text-ink-900">{displayNameOf(author)}</span>
            <span className="text-[11px] text-ink-300">{formatTime(message.createdAt)}</span>
            {message.pinned && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-lav-600">
                <Pin size={10} /> pinned
              </span>
            )}
          </p>
        )}

        {editing ? (
          <div className="mt-1">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onEditKey}
              rows={Math.min(8, draft.split("\n").length + 1)}
              className="input-base w-full resize-none font-normal"
              disabled={busy}
            />
            <p className="mt-1 text-[11px] text-ink-300">
              Enter to save · Esc to cancel
            </p>
          </div>
        ) : (
          <div className="flex items-baseline gap-1.5">
            {message.content && <MessageContent content={message.content} />}
            {message.editedAt && (
              <span className="shrink-0 text-[10px] text-ink-300">(edited)</span>
            )}
          </div>
        )}

        {!editing && attachments.length > 0 && (
          <MessageAttachments attachments={attachments} onPreviewImage={setPreviewImage} />
        )}

        {!editing && reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {reactions.map((reaction) => {
              const users = (reaction.userIds || []).map((id) => id.toString());
              const mine = users.includes(String(viewerId));
              return (
                <button
                  key={reaction.emoji}
                  onClick={() => onToggleReaction(message, reaction.emoji)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs transition",
                    mine
                      ? "border-lav-300 bg-lav-100 text-lav-700"
                      : "border-cream-300 bg-white text-ink-500 hover:border-lav-200 hover:text-lav-700"
                  )}
                  title="Toggle reaction"
                >
                  {reaction.emoji} {users.length}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* hover actions */}
      {!editing && (
        <div className="absolute -top-3 right-4 hidden items-center gap-0.5 rounded-xl border border-cream-300 bg-white p-0.5 shadow-sm group-hover:flex">
          {onStartThread && (
            <ActionButton icon={MessageSquarePlus} label="Reply in thread" onClick={() => onStartThread(message)} />
          )}
          {canPin && (
            <ActionButton
              icon={message.pinned ? PinOff : Pin}
              label={message.pinned ? "Unpin" : "Pin"}
              onClick={() => onTogglePin(message)}
            />
          )}
          <div className="relative">
            <ActionButton
              icon={SmilePlus}
              label="Add reaction"
              onClick={() => setPickerOpen((open) => !open)}
            />
            {pickerOpen && (
              <div className="absolute right-0 top-8 z-10 flex gap-1 rounded-lg border border-cream-300 bg-white p-1 shadow-md">
                {REACTION_PRESETS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onToggleReaction(message, emoji);
                      setPickerOpen(false);
                    }}
                    className="rounded-md px-1.5 py-1 text-sm transition hover:bg-cream-200"
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isMine && <ActionButton icon={Pencil} label="Edit" onClick={startEdit} />}
          {(isMine || canManage) && (
            <ActionButton icon={Trash2} label="Delete" danger onClick={() => onDelete(message)} />
          )}
        </div>
      )}

      <AttachmentImageLightbox attachment={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
};
