import { Navigate, useOutletContext, useParams } from "react-router-dom";
import { Hash, Menu as MenuIcon } from "lucide-react";
import { EmptyState } from "../components/ui/EmptyState";

/** /app/servers/:serverId — jump to the first text channel if there is one. */
const ServerIndex = () => {
  const { serverId } = useParams();
  const { channels, openSidebar } = useOutletContext();

  const first = channels.find((c) => c.type !== "voice") || channels[0];
  if (first) {
    return <Navigate to={`/app/servers/${serverId}/channels/${first._id}`} replace />;
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 items-center gap-2 border-b border-cream-300 px-3 md:hidden">
        <button
          onClick={openSidebar}
          className="rounded-lg p-2 text-ink-500 transition hover:bg-cream-200"
          aria-label="Open sidebar"
        >
          <MenuIcon size={18} />
        </button>
      </header>
      <EmptyState
        icon={Hash}
        title="No channels yet"
        body="Ask a moderator to create a channel, or create one yourself from the server menu."
        className="flex-1"
      />
    </div>
  );
};

export default ServerIndex;
