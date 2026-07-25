import { ExternalLink, X } from "lucide-react";

/**
 * In-browser resource preview. PDFs render through the browser's native
 * viewer (scroll / zoom / page nav for free) via an iframe pointed at the
 * Cloudinary delivery URL; images render directly.
 */
export const ResourcePreviewModal = ({ resource, onClose }) => {
  if (!resource) return null;
  const isImage = resource.kind === "image";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink-900/70 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 px-4">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
          {resource.title}
          <span className="ml-2 text-xs font-normal text-white/60">{resource.originalName}</span>
        </p>
        <a
          href={resource.fileUrl}
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

      <div className="min-h-0 flex-1 px-4 pb-4">
        {isImage ? (
          <div className="flex h-full items-center justify-center">
            <img
              src={resource.fileUrl}
              alt={resource.title}
              className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
            />
          </div>
        ) : (
          <iframe
            src={resource.fileUrl}
            title={resource.title}
            className="h-full w-full rounded-xl border-0 bg-white shadow-2xl"
          />
        )}
      </div>
    </div>
  );
};
