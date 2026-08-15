import { ExternalLink, X } from "lucide-react";

/** Full-screen image viewer for a clicked message attachment. */
export const AttachmentImageLightbox = ({ attachment, onClose }) => {
  if (!attachment) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink-900/70 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 px-4">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
          {attachment.originalName}
        </p>
        <a
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <ExternalLink size={13} /> Open in new tab
        </a>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label="Close preview"
        >
          <X size={17} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
        <img
          src={attachment.url}
          alt={attachment.originalName}
          className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
        />
      </div>
    </div>
  );
};
