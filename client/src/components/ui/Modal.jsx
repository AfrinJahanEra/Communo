import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export const Modal = ({ open, onClose, title, size = "md", children, footer }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className={cn("card w-full overflow-hidden animate-pop", SIZES[size])}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-cream-300 px-5 py-4">
          <h2 className="text-base font-bold text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-300 transition hover:bg-cream-200 hover:text-ink-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-cream-300 bg-cream-100/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
};
