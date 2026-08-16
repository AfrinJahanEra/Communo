import { LogOut, Settings } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Menu } from "../ui/Menu";
import { useAuth } from "../../hooks/useAuth";
import { usePresence } from "../../hooks/usePresence";
import { displayNameOf, STATUS_META, cn } from "../../lib/utils";

const STATUS_OPTIONS = ["online", "idle", "dnd"];

/** Bottom-of-sidebar card: identity, presence switcher, settings, logout. */
export const UserFooter = ({ onOpenSettings }) => {
  const { user, logout } = useAuth();
  const { myStatus, setMyStatus } = usePresence();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 border-t border-cream-300 bg-cream-200/70 px-3 py-2.5">
      <Menu
        align="left"
        className="min-w-0 flex-1"
        trigger={({ toggle }) => (
          <button
            onClick={toggle}
            className="flex w-full min-w-0 items-center gap-2.5 rounded-xl px-1.5 py-1 text-left transition hover:bg-cream-300/60"
            title="Set status"
          >
            <Avatar user={user} size="sm" showStatus />
            <span className="min-w-0">
              <span
                title={displayNameOf(user)}
                className="block truncate text-sm font-semibold text-ink-900"
              >
                {displayNameOf(user)}
              </span>
              <span className="block truncate text-[11px] text-ink-500">
                {STATUS_META[myStatus]?.label || "Offline"}
              </span>
            </span>
          </button>
        )}
        items={STATUS_OPTIONS.map((status) => ({
          label: STATUS_META[status].label,
          icon: (props) => (
            <span {...props} className={cn("h-2.5 w-2.5 rounded-full", STATUS_META[status].dot)} />
          ),
          onClick: () => setMyStatus(status),
        }))}
      />
      <button
        onClick={onOpenSettings}
        title="User settings"
        className="shrink-0 rounded-lg p-2 text-ink-500 transition hover:bg-cream-300/60 hover:text-ink-900"
      >
        <Settings size={17} />
      </button>
      <button
        onClick={logout}
        title="Log out"
        className="shrink-0 rounded-lg p-2 text-ink-500 transition hover:bg-status-dnd/10 hover:text-status-dnd"
      >
        <LogOut size={17} />
      </button>
    </div>
  );
};
