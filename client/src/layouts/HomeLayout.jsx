import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useOutletContext, useParams } from "react-router-dom";
import { Users } from "lucide-react";
import { SidebarShell } from "../components/layout/SidebarShell";
import { UserFooter } from "../components/layout/UserFooter";
import { Avatar } from "../components/ui/Avatar";
import { useAuth } from "../hooks/useAuth";
import { useSocketEvent } from "../hooks/useSocket";
import { listDms } from "../services/dmService";
import { cn, displayNameOf, dmPartner, idOf } from "../lib/utils";

/** Home area: Friends nav + live DM list in the sidebar. */
const HomeLayout = () => {
  const { user } = useAuth();
  const { openUserSettings } = useOutletContext();
  const { dmId } = useParams();
  const [dms, setDms] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const refreshDms = useCallback(() => {
    listDms()
      .then(setDms)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshDms();
  }, [refreshDms]);

  // New message → bump that DM to the top (or refetch if it's unknown).
  useSocketEvent(
    "dm:new",
    ({ message }) => {
      const id = idOf(message.dmId);
      const authorId = idOf(message.authorId);
      setDms((prev) => {
        const idx = prev.findIndex((d) => d._id === id);
        if (idx === -1) {
          refreshDms();
          return prev;
        }
        const next = [...prev];
        const [dm] = next.splice(idx, 1);
        const unreadCount =
          authorId === String(user?._id) || id === dmId ? dm.unreadCount || 0 : (dm.unreadCount || 0) + 1;
        return [{ ...dm, lastMessageAt: message.createdAt, unreadCount }, ...next];
      });
    },
    [dmId, refreshDms, user?._id]
  );

  useSocketEvent(
    "dm:read",
    ({ dmId: readDmId, userId, unreadCount }) => {
      if (String(userId) !== String(user?._id)) return;
      setDms((prev) =>
        prev.map((dm) => (dm._id === String(readDmId) ? { ...dm, unreadCount } : dm))
      );
    },
    [user?._id]
  );

  return (
    <div className="flex h-full">
      <SidebarShell open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <div className="border-b border-cream-300 px-4 py-[1.05rem]">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-lav-700">Home</h2>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-3">
          <NavLink
            to="/app"
            end
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                isActive
                  ? "bg-lav-500 text-white shadow-sm"
                  : "text-ink-700 hover:bg-cream-300/70"
              )
            }
          >
            <Users size={17} /> Friends
          </NavLink>

          <div>
            <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-300">
              Direct messages
            </p>
            {dms.length === 0 ? (
              <p className="px-3 py-2 text-xs text-ink-300">
                No conversations yet — message a friend to start one.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {dms.map((dm) => {
                  const partner = dmPartner(dm, user?._id);
                  return (
                    <li key={dm._id}>
                      <NavLink
                        to={`/app/dms/${dm._id}`}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2.5 rounded-xl px-3 py-2 transition",
                            isActive ? "bg-lav-100 text-lav-800" : "text-ink-700 hover:bg-cream-300/70"
                          )
                        }
                      >
                        <span className="relative shrink-0">
                          <Avatar user={partner} size="sm" showStatus />
                          {Number(dm.unreadCount) > 0 && (
                            <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full border-2 border-cream-50 bg-lav-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                              {Number(dm.unreadCount) > 99 ? "99+" : dm.unreadCount}
                            </span>
                          )}
                        </span>
                        <span className="truncate text-sm font-medium">{displayNameOf(partner)}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <UserFooter onOpenSettings={openUserSettings} />
      </SidebarShell>

      <main className="min-w-0 flex-1">
        <Outlet
          context={{
            dms,
            refreshDms,
            openSidebar: () => setSidebarOpen(true),
            activeDmId: dmId,
          }}
        />
      </main>
    </div>
  );
};

export default HomeLayout;
