import { useCallback, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, XCircle, X } from "lucide-react";
import { ToastContext } from "./contexts";
import { cn } from "../lib/utils";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const STYLES = {
  success: "border-status-online/40 text-ink-900",
  error: "border-status-dnd/40 text-ink-900",
  info: "border-lav-300 text-ink-900",
};

const ICON_COLOR = {
  success: "text-status-online",
  error: "text-status-dnd",
  info: "text-lav-500",
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, body, type = "info", duration = 4500 }) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev.slice(-3), { id, title, body, type }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-xl border bg-white/95 p-3 shadow-lg backdrop-blur animate-slide-up",
                STYLES[t.type] || STYLES.info
              )}
              role="status"
            >
              <Icon size={18} className={cn("mt-0.5 shrink-0", ICON_COLOR[t.type])} />
              <div className="min-w-0 flex-1">
                {t.title && <p className="text-sm font-semibold">{t.title}</p>}
                {t.body && <p className="mt-0.5 break-words text-xs text-ink-500">{t.body}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded p-0.5 text-ink-300 transition hover:text-ink-700"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
