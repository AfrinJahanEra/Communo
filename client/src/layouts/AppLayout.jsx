import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ServerRail } from "../components/layout/ServerRail";
import { CreateServerModal } from "../components/modals/CreateServerModal";
import { UserSettingsModal } from "../components/modals/UserSettingsModal";
import { useAuth } from "../hooks/useAuth";
import { useSocketEvent } from "../hooks/useSocket";
import { useToast } from "../hooks/useToast";
import { getMyServers } from "../services/serverService";
import { displayNameOf, idOf } from "../lib/utils";

/**
 * Authenticated shell: server rail + nested area (home / server views).
 * Also hosts global toast notifications for social events.
 */
const AppLayout = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  const [servers, setServers] = useState([]);
  const [serverNotifications, setServerNotifications] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeServerId = useMemo(() => {
    const match = location.pathname.match(/^\/app\/servers\/([^/]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  const visibleServerNotifications = useMemo(() => {
    const known = new Set(servers.map((server) => server._id));
    return Object.fromEntries(
      Object.entries(serverNotifications).filter(
        ([serverId, count]) => known.has(serverId) && serverId !== activeServerId && Number(count) > 0
      )
    );
  }, [activeServerId, serverNotifications, servers]);

  const refreshServers = useCallback(async () => {
    try {
      setServers(await getMyServers());
    } catch {
      /* rail silently keeps the previous list */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    getMyServers()
      .then((list) => {
        if (alive) setServers(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!activeServerId) return;
    // Opening a server marks its pending rail notifications as seen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setServerNotifications((prev) => {
      if (!prev[activeServerId]) return prev;
      return { ...prev, [activeServerId]: 0 };
    });
  }, [activeServerId]);

  // ---- global notifications ----
  useSocketEvent(
    "friend:request",
    ({ requester }) => {
      toast({
        title: `${displayNameOf(requester)} sent you a friend request`,
        body: "Open Friends → Pending to respond.",
      });
    },
    [toast]
  );

  useSocketEvent(
    "friend:accepted",
    ({ friend }) => {
      toast({
        type: "success",
        title: `${displayNameOf(friend)} accepted your friend request`,
      });
    },
    [toast]
  );

  useSocketEvent(
    "dm:new",
    ({ message }) => {
      const authorId = idOf(message.authorId);
      const dmId = idOf(message.dmId);
      if (authorId === String(user?._id)) return; // own message
      if (location.pathname === `/app/dms/${dmId}`) return; // already reading it
      const author = typeof message.authorId === "object" ? message.authorId : null;
      toast({
        title: `New message${author ? ` from ${displayNameOf(author)}` : ""}`,
        body: message.content?.slice(0, 80),
      });
    },
    [user?._id, location.pathname, toast]
  );

  useSocketEvent(
    "server:notification",
    ({ serverId, delta }) => {
      const id = String(serverId || "");
      if (!id) return;
      if (id === activeServerId) return;
      setServerNotifications((prev) => ({
        ...prev,
        [id]: Math.max(0, Number(prev[id] || 0) + Number(delta || 1)),
      }));
    },
    [activeServerId]
  );

  return (
    <div className="flex h-full overflow-hidden">
      <ServerRail
        servers={servers}
        onCreate={() => setCreateOpen(true)}
        notificationCounts={visibleServerNotifications}
      />
      <div className="min-w-0 flex-1">
        <Outlet context={{ servers, refreshServers, openUserSettings: () => setSettingsOpen(true) }} />
      </div>

      <CreateServerModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refreshServers}
      />
      <UserSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default AppLayout;
