import { cn } from "../../lib/utils";

export const Field = ({ label, error, hint, children }) => (
  <label className="block">
    {label && <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</span>}
    {children}
    {error ? (
      <span className="mt-1 block text-xs text-status-dnd">{error}</span>
    ) : hint ? (
      <span className="mt-1 block text-xs text-ink-300">{hint}</span>
    ) : null}
  </label>
);

export const Input = ({ className, error, ...props }) => (
  <input
    className={cn("input-base", error && "border-status-dnd focus:border-status-dnd focus:ring-status-dnd/20", className)}
    {...props}
  />
);

export const TextArea = ({ className, error, rows = 3, ...props }) => (
  <textarea
    rows={rows}
    className={cn(
      "input-base resize-none",
      error && "border-status-dnd focus:border-status-dnd focus:ring-status-dnd/20",
      className
    )}
    {...props}
  />
);

export const Select = ({ className, children, ...props }) => (
  <select className={cn("input-base appearance-none", className)} {...props}>
    {children}
  </select>
);
