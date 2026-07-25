import { cn } from "../../lib/utils";
import { Spinner } from "./Spinner";

const VARIANTS = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  outline:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-lav-300 px-4 py-2.5 text-sm font-semibold text-lav-700 transition hover:bg-lav-50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "",
};

export const Button = ({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}) => (
  <button
    className={cn(VARIANTS[variant], SIZES[size], className)}
    disabled={disabled || loading}
    {...props}
  >
    {loading && <Spinner size={14} className="border-white/40 border-t-white" />}
    {children}
  </button>
);
