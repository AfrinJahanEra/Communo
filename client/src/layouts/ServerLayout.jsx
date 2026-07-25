import { useCallback, useEffect, useMemo, useState } from "react";
import {
  NavLink,
  Outlet,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import {
  ChevronDown,
  Code2,
  Hash,
  Megaphone,
  Sparkles,
  Volume2,
  UserPlus,
  Settings,
  PlusCircle,
  DoorOpen,
  Trash2,
  Lock,
} from "lucide-react";
import { SidebarShell } from "../components/layout/SidebarShell";
import { UserFooter } from "../components/layout/UserFooter";
import { Menu } from "../components/ui/Menu";
import { LoadingScreen } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { InviteModal } from "../components/modals/InviteModal";
import { CreateChannelModal } from "../components/modals/CreateChannelModal";
import { ServerSettingsModal } from "../components/modals/ServerSettingsModal";
import { useAuth } from "../hooks/useAuth";
import { usePresence } from "../hooks/usePresence";
import { useToast } from "../hooks/useToast";
import { apiMessage } from "../lib/api";
import { cn, idOf } from "../lib/utils";
import { computePermissions, hasPermission, PERMISSIONS } from "../lib/permissions";
import * as serverService from "../services/serverService";
import { listChannels } from "../services/channelService";

const CHANNEL_ICONS = { text: Hash, announcement: Megaphone, voice: Volume2 };

/** Fixed per-server sections: collaborative IDE + AI study assistant. */
const WORKSPACE_LINKS = [
  { path: "ide", label: "Collaborative IDE", icon: Code2 },
  { path: "study", label: "AI Study Assistant", icon: Sparkles },
];

const WorkspaceLink = ({ serverId, link, onNavigate }) => (
  <NavLink
    to={`/app/servers/${serverId}/${link.path}`}
    onClick={onNavigate}
    className={({ isActive }) =>
      cn(
        "group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition",
        isActive
          ? "bg-lav-100 font-semibold text-lav-800"
          : "text-ink-500 hover:bg-cream-300/70 hover:text-ink-900"
      )
    }
  >
    <link.icon size={15} className="shrink-0 opacity-70" />
    <span className="truncate">{link.label}</span>
  </NavLink>
);

const ChannelLink = ({ serverId, channel, onNavigate }) => {
  const Icon = CHANNEL_ICONS[channel.type] || Hash;
  return (
    <NavLink
      to={`/app/servers/${serverId}/channels/${channel._id}`}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition",
          isActive
            ? "bg-lav-100 font-semibold text-lav-800"
            : "text-ink-500 hover:bg-cream-300/70 hover:text-ink-900"
        )
      }
    >
      <Icon size={15} className="shrink-0 opacity-70" />
      <span className="truncate">{channel.name}</span>
      {channel.isPrivate && <Lock size={11} className="ml-auto shrink-0 opacity-50" />}
    </NavLink>
  );
};

/** Server area: loads server data, renders channel sidebar + channel outlet. */
const ServerLayout = () => {
  const { serverId } = useParams();
  const { user } = useAuth();
  const { refreshServers, openUserSettings } = useOutletContext();
  const { prime } = usePresence();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState(null); // { server, roles, channels, members }
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);

  const load = useCallback(async () => {
    const [details, channels, membersRes, presences] = await Promise.all([
      serverService.getServer(serverId),
      listChannels(serverId),
      serverService.listMembers(serverId, { limit: 100 }),
      serverService.getServerPresence(serverId).catch(() => []),
    ]);
    return {
      server: details.server,
      roles: details.roles,
      channels,
      members: membersRes.members,
      presences,
    };
  }, [serverId]);

  // Clear stale data during render as soon as the server id changes.
  const [prevServerId, setPrevServerId] = useState(serverId);
  if (serverId !== prevServerId) {
    setPrevServerId(serverId);
    setData(null);
    setError("");
  }

  useEffect(() => {
    let alive = true;
    load()
      .then((result) => {
        if (!alive) return;
        setData(result);
        prime(result.presences);
      })
      .catch((err) => {
        if (alive) setError(apiMessage(err, "Could not load this server"));
      });
    return () => {
      alive = false;
    };
  }, [load, prime]);

  const refresh = useCallback(() => {
    load()
      .then((result) => {
        setData(result);
        prime(result.presences);
      })
      .catch(() => {});
  }, [load, prime]);

  const myMembership = useMemo(
    () => data?.members?.find((m) => idOf(m.userId) === String(user?._id)),
    [data?.members, user?._id]
  );

  const myPermissions = useMemo(
    () => computePermissions(data?.server, myMembership, data?.roles, user?._id),
    [data?.server, myMembership, data?.roles, user?._id]
  );

  const isOwner = data?.server && idOf(data.server.ownerId) === String(user?._id);

  const onLeave = async () => {
    if (!window.confirm(`Leave ${data.server.name}?`)) return;
    try {
      await serverService.leaveServer(serverId);
      toast({ type: "success", title: `You left ${data.server.name}` });
      refreshServers();
      navigate("/app");
    } catch (err) {
      toast({ type: "error", title: "Could not leave server", body: apiMessage(err) });
    }
  };

  const onDelete = async () => {
    if (!window.confirm(`Delete ${data.server.name}? This cannot be undone.`)) return;
    try {
      await serverService.deleteServer(serverId);
      toast({ type: "success", title: "Server deleted" });
      refreshServers();
      navigate("/app");
    } catch (err) {
      toast({ type: "error", title: "Could not delete server", body: apiMessage(err) });
    }
  };

  if (error) {
    return (
      <EmptyState
        icon={DoorOpen}
        title="We couldn't open this server"
        body={error}
        action={
          <Button variant="outline" onClick={() => navigate("/app")}>
            Back to home
          </Button>
        }
        className="h-full"
      />
    );
  }

  if (!data) return <LoadingScreen label="Opening server…" />;

  const { server, roles, channels, members } = data;
  const textChannels = channels.filter((c) => c.type !== "voice");
  const voiceChannels = channels.filter((c) => c.type === "voice");
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-full">
      <SidebarShell open={sidebarOpen} onClose={closeSidebar}>
        {/* Server header */}
        <Menu
          align="left"
          className="border-b border-cream-300"
          trigger={({ toggle }) => (
            <button
              onClick={toggle}
              className="flex w-full items-center justify-between px-4 py-[1.05rem] text-left transition hover:bg-cream-300/50"
            >
              <span className="truncate text-sm font-extrabold text-ink-900">{server.name}</span>
              <ChevronDown size={16} className="shrink-0 text-ink-500" />
            </button>
          )}
          items={[
            hasPermission(myPermissions, PERMISSIONS.CREATE_INVITES) && {
              label: "Invite people",
              icon: UserPlus,
              onClick: () => setInviteOpen(true),
            },
            hasPermission(myPermissions, PERMISSIONS.MANAGE_SERVER) && {
              label: "Server settings",
              icon: Settings,
              onClick: () => setSettingsOpen(true),
            },
            hasPermission(myPermissions, PERMISSIONS.MANAGE_CHANNELS) && {
              label: "Create channel",
              icon: PlusCircle,
              onClick: () => setCreateChannelOpen(true),
            },
            { divider: true },
            !isOwner && { label: "Leave server", icon: DoorOpen, danger: true, onClick: onLeave },
            isOwner && { label: "Delete server", icon: Trash2, danger: true, onClick: onDelete },
          ]}
        />

        {/* Channels */}
        <div className="flex-1 space-y-5 overflow-y-auto p-3">
          <div>
            <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink-300">
              Workspace
            </p>
            <div className="space-y-0.5">
              {WORKSPACE_LINKS.map((link) => (
                <WorkspaceLink key={link.path} serverId={serverId} link={link} onNavigate={closeSidebar} />
              ))}
            </div>
          </div>
          {textChannels.length > 0 && (
            <div>
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink-300">
                Text channels
              </p>
              <div className="space-y-0.5">
                {textChannels.map((c) => (
                  <ChannelLink key={c._id} serverId={serverId} channel={c} onNavigate={closeSidebar} />
                ))}
              </div>
            </div>
          )}
          {voiceChannels.length > 0 && (
            <div>
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink-300">
                Voice study rooms
              </p>
              <div className="space-y-0.5">
                {voiceChannels.map((c) => (
                  <ChannelLink key={c._id} serverId={serverId} channel={c} onNavigate={closeSidebar} />
                ))}
              </div>
            </div>
          )}
          {channels.length === 0 && (
            <p className="px-2 py-2 text-xs text-ink-300">No channels you can see yet.</p>
          )}
        </div>

        <UserFooter onOpenSettings={openUserSettings} />
      </SidebarShell>

      <main className="min-w-0 flex-1">
        <Outlet
          context={{
            server,
            roles,
            channels,
            members,
            myPermissions,
            isOwner,
            refreshServer: refresh,
            refreshServers,
            openSidebar: () => setSidebarOpen(true),
            openInvite: () => setInviteOpen(true),
          }}
        />
      </main>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} server={server} canManage={hasPermission(myPermissions, PERMISSIONS.MANAGE_SERVER)} />
      <CreateChannelModal
        open={createChannelOpen}
        onClose={() => setCreateChannelOpen(false)}
        serverId={serverId}
        roles={roles}
        onCreated={refresh}
      />
      <ServerSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        server={server}
        roles={roles}
        members={members}
        myPermissions={myPermissions}
        isOwner={isOwner}
        onChanged={() => {
          refresh();
          refreshServers();
        }}
      />
    </div>
  );
};

export default ServerLayout;
