/** Joins truthy class names. */
export const cn = (...parts) => parts.filter(Boolean).join(" ");

export const initials = (name = "") =>
  name
    .split(/[\s-_.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

export const displayNameOf = (user) => user?.displayName || user?.username || "Unknown";

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** "14:05", "Yesterday 14:05" or "12 Mar 2026" — compact chat timestamps. */
export const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay(date, now)) return time;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return `Yesterday ${time}`;
  return date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
};

/** "last seen 5m ago" style relative time. */
export const timeAgo = (value) => {
  if (!value) return "a while ago";
  const secs = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString();
};

export const STATUS_META = {
  online: { label: "Online", dot: "bg-status-online" },
  idle: { label: "Idle", dot: "bg-status-idle" },
  dnd: { label: "Do Not Disturb", dot: "bg-status-dnd" },
  offline: { label: "Offline", dot: "bg-status-offline" },
};

/**
 * Splits message content into text and fenced ``` code segments so code
 * snippets render with a dedicated block (```lang\ncode``` supported).
 */
export const parseContent = (content = "") => {
  const segments = [];
  const regex = /```(\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "code", lang: match[1] || "", value: match[2].replace(/\n$/, "") });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }
  return segments.length ? segments : [{ type: "text", value: content }];
};

export const idOf = (value) => (value && typeof value === "object" ? value._id : value)?.toString();

/** "1.4 MB" style human-readable file sizes. */
export const formatBytes = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
};

/** Triggers a browser download for a Blob with the given filename. */
export const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

/** The friend a DM is with (the participant that isn't me). */
export const dmPartner = (dm, myId) =>
  (dm?.participantIds || []).find((p) => idOf(p) !== String(myId)) || null;

const GROUP_WINDOW_MS = 5 * 60 * 1000;

/** Two consecutive messages by the same author within 5 min collapse. */
export const isGrouped = (message, prev) =>
  prev &&
  idOf(prev.authorId) === idOf(message.authorId) &&
  new Date(message.createdAt) - new Date(prev.createdAt) < GROUP_WINDOW_MS;

/**
 * Splits plain text into text and http(s) link segments so URLs (e.g. invite
 * links) render as clickable anchors. Trailing punctuation stays as text.
 */
export const splitLinks = (text = "") => {
  const segments = [];
  const regex = /https?:\/\/[^\s<]+/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    let url = match[0];
    const trimmed = url.replace(/[.,!?;:'")\]]+$/, "");
    const trailing = url.slice(trimmed.length);
    url = trimmed;
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "link", value: url });
    if (trailing) segments.push({ type: "text", value: trailing });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  return segments.length ? segments : [{ type: "text", value: text }];
};
