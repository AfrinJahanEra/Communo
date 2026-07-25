import { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { AtSign } from "lucide-react";
import { ChatHeader } from "../components/chat/ChatHeader";
import { ChatPane } from "../components/chat/ChatPane";
import { Avatar } from "../components/ui/Avatar";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingScreen } from "../components/ui/Spinner";
import { useAuth } from "../hooks/useAuth";
import { useChat } from "../hooks/useChat";
import { usePresence } from "../hooks/usePresence";
import { listDms } from "../services/dmService";
import { displayNameOf, dmPartner, STATUS_META, timeAgo } from "../lib/utils";

/* The backend exposes DMs only as a list — resolve one by id from it. */
const resolveDm = (dmId) => listDms().then((list) => list.find((d) => d._id === dmId) || null);

/** One-to-one conversation. */
const DmPage = () => {
  const { dmId } = useParams();
  const { user } = useAuth();
  const { dms, openSidebar } = useOutletContext();
  const { statusOf, lastSeenOf } = usePresence();

  // The sidebar list usually has the DM already; fall back to fetching it.
  const known = dms.find((d) => d._id === dmId);
  const [fetched, setFetched] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const dm = known || (fetched?._id === dmId ? fetched : null);

  useEffect(() => {
    if (known) return undefined;
    let alive = true;
    resolveDm(dmId)
      .then((d) => {
        if (!alive) return;
        if (d) setFetched(d);
        else setNotFound(true);
      })
      .catch(() => alive && setNotFound(true));
    return () => {
      alive = false;
    };
  }, [dmId, known]);

  const chat = useChat("dm", dm ? dmId : null);

  if (notFound && !dm) {
    return (
      <EmptyState
        icon={AtSign}
        title="Conversation not found"
        body="This conversation may have been removed, or the link is wrong."
        className="h-full"
      />
    );
  }
  if (!dm) return <LoadingScreen label="Opening conversation…" />;

  const partner = dmPartner(dm, user?._id);
  const status = statusOf(partner?._id) || "offline";
  const subtitle =
    status === "offline"
      ? `Last seen ${timeAgo(lastSeenOf(partner?._id))}`
      : STATUS_META[status].label;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader
        title={displayNameOf(partner)}
        subtitle={subtitle}
        onOpenSidebar={openSidebar}
      >
        <Avatar user={partner} size="sm" showStatus />
      </ChatHeader>

      <ChatPane
        chat={chat}
        placeholder={`Message @${partner?.username ?? ""}`}
        canManage={false}
        canPin={false}
        emptyTitle={`This is the start of your conversation with ${displayNameOf(partner)}`}
        emptyBody="Say hi, share code snippets, plan your next study session."
      />
    </div>
  );
};

export default DmPage;
