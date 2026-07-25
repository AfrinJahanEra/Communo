import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Ban,
  Check,
  MessageCircle,
  ShieldOff,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { ChatHeader } from "../components/chat/ChatHeader";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { usePresence } from "../hooks/usePresence";
import { useSocketEvent } from "../hooks/useSocket";
import { useToast } from "../hooks/useToast";
import { apiMessage } from "../lib/api";
import { cn, displayNameOf, idOf, STATUS_META, timeAgo } from "../lib/utils";
import * as friendService from "../services/friendService";
import { openDm } from "../services/dmService";

const TABS = [
  { id: "online", label: "Online" },
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "blocked", label: "Blocked" },
];

const RowButton = ({ icon: Icon, label, danger, onClick }) => (
  <button
    onClick={onClick}
    title={label}
    className={cn(
      "rounded-xl p-2 transition",
      danger
        ? "bg-cream-100 text-ink-500 hover:bg-status-dnd/10 hover:text-status-dnd"
        : "bg-cream-100 text-ink-500 hover:bg-lav-100 hover:text-lav-700"
    )}
  >
    <Icon size={16} />
  </button>
);

const UserRow = ({ user, subtitle, children }) => (
  <li className="flex items-center gap-3 rounded-2xl border border-cream-300 bg-white px-3.5 py-2.5 transition hover:border-lav-300">
    <Avatar user={user} size="md" showStatus />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-ink-900">{displayNameOf(user)}</p>
      <p className="truncate text-xs text-ink-300">{subtitle ?? `@${user?.username}`}</p>
    </div>
    <div className="flex shrink-0 items-center gap-1.5">{children}</div>
  </li>
);

/** Friends hub: online/all lists, pending requests, blocks + add friend. */
const FriendsPage = () => {
  const { openSidebar, refreshDms } = useOutletContext();
  const { statusOf } = usePresence();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState("online");
  const [friends, setFriends] = useState(null);
  const [requests, setRequests] = useState(null); // { incoming, outgoing }
  const [blocks, setBlocks] = useState(null);
  const [addValue, setAddValue] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addFeedback, setAddFeedback] = useState(null); // { ok, text }

  const refresh = useCallback(() => {
    friendService.listFriends().then(setFriends).catch(() => setFriends([]));
    friendService.listFriendRequests().then(setRequests).catch(() => setRequests({ incoming: [], outgoing: [] }));
    friendService.listBlocks().then(setBlocks).catch(() => setBlocks([]));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useSocketEvent("friend:request", refresh, [refresh]);
  useSocketEvent("friend:accepted", refresh, [refresh]);
  useSocketEvent("friend:removed", refresh, [refresh]);

  const onlineFriends = useMemo(
    () =>
      (friends || []).filter((f) => {
        const status = statusOf(idOf(f.user));
        return status && status !== "offline";
      }),
    [friends, statusOf]
  );

  const pendingCount = (requests?.incoming?.length ?? 0) + (requests?.outgoing?.length ?? 0);

  // ---- actions ----

  const message = async (user) => {
    try {
      const dm = await openDm(idOf(user));
      refreshDms();
      navigate(`/app/dms/${dm._id}`);
    } catch (err) {
      toast({ type: "error", title: "Could not open conversation", body: apiMessage(err) });
    }
  };

  const withToast = (fn, successTitle) => async (...args) => {
    try {
      await fn(...args);
      if (successTitle) toast({ type: "success", title: successTitle });
      refresh();
    } catch (err) {
      toast({ type: "error", title: "Action failed", body: apiMessage(err) });
    }
  };

  const removeFriend = async (user) => {
    if (!window.confirm(`Remove ${displayNameOf(user)} from your friends?`)) return;
    await withToast(friendService.removeFriend, "Friend removed")(idOf(user));
  };

  const block = async (user) => {
    if (!window.confirm(`Block ${displayNameOf(user)}? They won't be able to send you requests or DMs.`)) return;
    await withToast(friendService.blockUser, "User blocked")(idOf(user));
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    const username = addValue.trim().toLowerCase();
    if (!username) return;
    setAddBusy(true);
    setAddFeedback(null);
    try {
      const res = await friendService.sendFriendRequest({ username });
      setAddFeedback({
        ok: true,
        text: res.autoAccepted
          ? `You and ${username} are now friends!`
          : `Friend request sent to ${username}.`,
      });
      setAddValue("");
      refresh();
    } catch (err) {
      setAddFeedback({ ok: false, text: apiMessage(err, "Could not send the request") });
    } finally {
      setAddBusy(false);
    }
  };

  // ---- tab bodies ----

  const renderFriendList = (list, emptyTitle, emptyBody) => {
    if (list === null) return <div className="flex justify-center py-10"><Spinner size={20} /></div>;
    if (list.length === 0) return <EmptyState icon={Users} title={emptyTitle} body={emptyBody} />;
    return (
      <ul className="space-y-2">
        {list.map(({ user, since }) => {
          const status = statusOf(idOf(user)) || "offline";
          return (
            <UserRow
              key={idOf(user)}
              user={user}
              subtitle={
                status === "offline"
                  ? `@${user.username} · friends ${timeAgo(since)}`
                  : `@${user.username} · ${STATUS_META[status].label}`
              }
            >
              <RowButton icon={MessageCircle} label="Message" onClick={() => message(user)} />
              <RowButton icon={UserMinus} label="Remove friend" danger onClick={() => removeFriend(user)} />
              <RowButton icon={Ban} label="Block" danger onClick={() => block(user)} />
            </UserRow>
          );
        })}
      </ul>
    );
  };

  const renderPending = () => {
    if (requests === null) return <div className="flex justify-center py-10"><Spinner size={20} /></div>;
    const { incoming = [], outgoing = [] } = requests;
    if (incoming.length === 0 && outgoing.length === 0) {
      return (
        <EmptyState
          icon={UserPlus}
          title="No pending requests"
          body="Send a request from the Add friend box above."
        />
      );
    }
    return (
      <div className="space-y-5">
        {incoming.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-300">
              Incoming — {incoming.length}
            </p>
            <ul className="space-y-2">
              {incoming.map((req) => (
                <UserRow key={req._id} user={req.requesterId} subtitle={`@${req.requesterId?.username} · ${timeAgo(req.createdAt)}`}>
                  <RowButton
                    icon={Check}
                    label="Accept"
                    onClick={() => withToast(friendService.acceptFriendRequest, "Friend request accepted")(req._id)}
                  />
                  <RowButton
                    icon={X}
                    label="Decline"
                    danger
                    onClick={() => withToast(friendService.declineFriendRequest)(req._id)}
                  />
                </UserRow>
              ))}
            </ul>
          </div>
        )}
        {outgoing.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-300">
              Outgoing — {outgoing.length}
            </p>
            <ul className="space-y-2">
              {outgoing.map((req) => (
                <UserRow key={req._id} user={req.recipientId} subtitle={`@${req.recipientId?.username} · sent ${timeAgo(req.createdAt)}`}>
                  <RowButton
                    icon={X}
                    label="Cancel request"
                    danger
                    onClick={() => withToast(friendService.declineFriendRequest, "Request cancelled")(req._id)}
                  />
                </UserRow>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderBlocked = () => {
    if (blocks === null) return <div className="flex justify-center py-10"><Spinner size={20} /></div>;
    if (blocks.length === 0) {
      return <EmptyState icon={ShieldOff} title="No blocked users" body="Users you block will show up here." />;
    }
    return (
      <ul className="space-y-2">
        {blocks.map((b) => (
          <UserRow key={b._id} user={b.blockedId} subtitle={`@${b.blockedId?.username} · blocked ${timeAgo(b.createdAt)}`}>
            <RowButton
              icon={ShieldOff}
              label="Unblock"
              onClick={() => withToast(friendService.unblockUser, "User unblocked")(idOf(b.blockedId))}
            />
          </UserRow>
        ))}
      </ul>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader icon={Users} title="Friends" onOpenSidebar={openSidebar} />

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto w-full max-w-2xl space-y-5">
          {/* Add friend */}
          <form onSubmit={submitAdd} className="card space-y-2 p-4">
            <p className="text-sm font-bold text-ink-900">Add a friend</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter a username, e.g. ada_lovelace"
                value={addValue}
                onChange={(e) => {
                  setAddValue(e.target.value);
                  setAddFeedback(null);
                }}
              />
              <Button type="submit" loading={addBusy} disabled={!addValue.trim()}>
                <UserPlus size={15} /> Send
              </Button>
            </div>
            {addFeedback && (
              <p className={cn("text-xs", addFeedback.ok ? "text-status-online" : "text-status-dnd")}>
                {addFeedback.text}
              </p>
            )}
          </form>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl bg-cream-200 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-semibold transition",
                  tab === t.id ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900"
                )}
              >
                {t.label}
                {t.id === "pending" && pendingCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-lav-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === "online" &&
            renderFriendList(
              friends === null ? null : onlineFriends,
              "Nobody's online right now",
              "Friends will appear here when they come online."
            )}
          {tab === "all" &&
            renderFriendList(friends, "No friends yet", "Add classmates by username to get started.")}
          {tab === "pending" && renderPending()}
          {tab === "blocked" && renderBlocked()}
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;
