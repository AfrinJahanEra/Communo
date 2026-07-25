import { cn } from "../../lib/utils";

/** Friendly empty state with an icon, message and optional action. */
export const EmptyState = ({ icon: Icon, title, body, action, className }) => (
  <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}>
    {Icon && (
      <span className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-lav-100 text-lav-500">
        <Icon size={26} />
      </span>
    )}
    <p className="text-sm font-semibold text-ink-700">{title}</p>
    {body && <p className="max-w-xs text-xs leading-relaxed text-ink-500">{body}</p>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);
