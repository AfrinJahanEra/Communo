import { useState } from "react";
import { cn } from "../../lib/utils";
import { useClickOutside } from "../../hooks/useClickOutside";

/**
 * Lightweight dropdown menu. `trigger` is a render-prop receiving {open, toggle}.
 * items: [{ label, icon, onClick, danger, divider }]
 */
export const Menu = ({ trigger, items, align = "right", className }) => {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false), open);

  return (
    <div className={cn("relative", className)} ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={cn(
            "absolute z-40 mt-1.5 min-w-44 overflow-hidden rounded-xl border border-cream-300 bg-white py-1 shadow-lg animate-pop",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items
            .filter(Boolean)
            .map((item, i) =>
              item.divider ? (
                <div key={`div-${i}`} className="my-1 border-t border-cream-200" />
              ) : (
                <button
                  key={item.label}
                  onClick={() => {
                    setOpen(false);
                    item.onClick?.();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition",
                    item.danger
                      ? "text-status-dnd hover:bg-status-dnd/10"
                      : "text-ink-700 hover:bg-lav-50 hover:text-lav-700"
                  )}
                >
                  {item.icon && <item.icon size={15} className="shrink-0" />}
                  {item.label}
                </button>
              )
            )}
        </div>
      )}
    </div>
  );
};
