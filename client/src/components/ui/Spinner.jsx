import { cn } from "../../lib/utils";

export const Spinner = ({ size = 20, className }) => (
  <span
    className={cn("inline-block animate-spin rounded-full border-2 border-lav-300 border-t-lav-600", className)}
    style={{ width: size, height: size }}
    role="status"
    aria-label="Loading"
  />
);

/** Full-area centered spinner for loading views. */
export const LoadingScreen = ({ label = "Loading…" }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-3 py-16">
    <Spinner size={28} />
    <p className="text-sm text-ink-500">{label}</p>
  </div>
);
