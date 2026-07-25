import { Menu as MenuIcon } from "lucide-react";

/**
 * Sticky top bar for chat views: hamburger (mobile sidebar), icon + title,
 * optional subtitle and a right-side actions slot.
 */
export const ChatHeader = ({ icon: Icon, title, subtitle, onOpenSidebar, children }) => (
  <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-cream-300 bg-cream-50/90 px-3 backdrop-blur sm:px-4">
    {onOpenSidebar && (
      <button
        onClick={onOpenSidebar}
        className="rounded-lg p-2 text-ink-500 transition hover:bg-cream-200 md:hidden"
        aria-label="Open sidebar"
      >
        <MenuIcon size={18} />
      </button>
    )}
    {Icon && <Icon size={18} className="shrink-0 text-lav-600" />}
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-sm font-bold text-ink-900">{title}</h1>
      {subtitle && <p className="truncate text-[11px] text-ink-300">{subtitle}</p>}
    </div>
    <div className="flex shrink-0 items-center gap-1">{children}</div>
  </header>
);

/** Icon button used in chat headers. */
export const HeaderButton = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    title={label}
    className={
      active
        ? "rounded-lg bg-lav-100 p-2 text-lav-700 transition"
        : "rounded-lg p-2 text-ink-500 transition hover:bg-cream-200 hover:text-ink-900"
    }
  >
    <Icon size={17} />
  </button>
);
