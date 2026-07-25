import { cn } from "../../lib/utils";

/**
 * Contextual sidebar (channels / DMs). Static on ≥md screens,
 * slide-in drawer over the content on mobile.
 */
export const SidebarShell = ({ open, onClose, children }) => (
  <>
    {open && (
      <div
        className="fixed inset-0 z-30 bg-ink-900/30 backdrop-blur-[2px] md:hidden"
        onClick={onClose}
      />
    )}
    <aside
      className={cn(
        "z-40 flex h-full w-64 shrink-0 flex-col border-r border-cream-300 bg-cream-200/80",
        "fixed inset-y-0 left-[68px] transition-transform duration-200 md:static md:left-auto md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-[120%]"
      )}
    >
      {children}
    </aside>
  </>
);
