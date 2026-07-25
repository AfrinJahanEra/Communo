import { cn, initials, displayNameOf } from "../../lib/utils";
import { usePresence } from "../../hooks/usePresence";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

const DOT_SIZES = {
  xs: "h-2 w-2 border",
  sm: "h-2.5 w-2.5 border-2",
  md: "h-3 w-3 border-2",
  lg: "h-3.5 w-3.5 border-2",
  xl: "h-4 w-4 border-2",
};

const DOT_COLORS = {
  online: "bg-status-online",
  idle: "bg-status-idle",
  dnd: "bg-status-dnd",
  offline: "bg-status-offline",
};

/** User avatar (image or initials) with an optional live presence dot. */
export const Avatar = ({ user, size = "md", showStatus = false, className }) => {
  const presence = usePresence();
  const status = showStatus && user?._id ? presence?.statusOf(user._id) : null;
  const name = displayNameOf(user);

  return (
    <span className={cn("relative inline-block shrink-0", className)}>
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt={name}
          className={cn("rounded-full object-cover", SIZES[size])}
        />
      ) : (
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-lav-200 font-semibold text-lav-800",
            SIZES[size]
          )}
        >
          {initials(name)}
        </span>
      )}
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-cream-50",
            DOT_SIZES[size],
            DOT_COLORS[status]
          )}
          title={status}
        />
      )}
    </span>
  );
};
