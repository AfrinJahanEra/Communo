import { useCallback, useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { FolderOpen, Sparkles } from "lucide-react";
import { ChatHeader } from "../components/chat/ChatHeader";
import { AiChatPanel } from "../components/study/AiChatPanel";
import { ResourcePanel } from "../components/study/ResourcePanel";
import { ResourcePreviewModal } from "../components/study/ResourcePreviewModal";
import { useAuth } from "../hooks/useAuth";
import { useSocket, useSocketEvent } from "../hooks/useSocket";
import { useToast } from "../hooks/useToast";
import { apiMessage } from "../lib/api";
import { hasPermission, PERMISSIONS } from "../lib/permissions";
import { emitAck } from "../lib/socket";
import { cn, idOf } from "../lib/utils";
import * as resourceService from "../services/resourceService";

/**
 * AI Study Assistant for one server: shared resources (PDFs, notes, slides)
 * on the left, Groq-backed doubt solver on the right. The socket joins the
 * server room so resource changes broadcast live to every member.
 */
const StudyPage = () => {
  const { serverId } = useParams();
  const { openSidebar, myPermissions } = useOutletContext();
  const { user } = useAuth();
  const { ready } = useSocket();
  const { toast } = useToast();

  const [resources, setResources] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(null);
  const [tab, setTab] = useState("ai"); // mobile-only: "resources" | "ai"

  // Reset synchronously when switching servers
  const [prevServerId, setPrevServerId] = useState(serverId);
  if (serverId !== prevServerId) {
    setPrevServerId(serverId);
    setResources([]);
    setTotal(0);
    setLoading(true);
    setSearch("");
    setPreview(null);
  }

  // Join the server room for resource:* broadcasts
  useEffect(() => {
    if (!serverId || !ready) return undefined;
    emitAck("server:subscribe", { serverId });
    return () => {
      emitAck("server:unsubscribe", { serverId });
    };
  }, [serverId, ready]);

  // Fetch (debounced while typing a search)
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const data = await resourceService.listResources(serverId, {
          ...(search.trim() ? { search: search.trim() } : {}),
          limit: 5,
        });
        if (!alive) return;
        setResources(data.resources);
        setTotal(data.total);
      } catch (err) {
        if (alive) toast({ type: "error", title: "Couldn't load resources", body: apiMessage(err) });
      } finally {
        if (alive) setLoading(false);
      }
    };
    const timer = setTimeout(run, search ? 350 : 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId, search]);

  // ---- live resource events (server room) ----
  useSocketEvent(
    "resource:created",
    (payload) => {
      if (idOf(payload.resource?.serverId) !== serverId) return;
      setResources((prev) =>
        prev.some((r) => idOf(r._id) === idOf(payload.resource._id))
          ? prev
          : [payload.resource, ...prev]
      );
      setTotal((t) => t + 1);
    },
    [serverId]
  );

  useSocketEvent(
    "resource:updated",
    (payload) => {
      if (idOf(payload.resource?.serverId) !== serverId) return;
      setResources((prev) =>
        prev.map((r) => (idOf(r._id) === idOf(payload.resource._id) ? payload.resource : r))
      );
    },
    [serverId]
  );

  useSocketEvent(
    "resource:deleted",
    (payload) => {
      if (idOf(payload.serverId) !== serverId) return;
      setResources((prev) => prev.filter((r) => idOf(r._id) !== idOf(payload.resourceId)));
      setTotal((t) => Math.max(0, t - 1));
      setPreview((p) => (p && idOf(p._id) === idOf(payload.resourceId) ? null : p));
    },
    [serverId]
  );

  const canDeleteResource = useCallback(
    (resource) =>
      idOf(resource.uploaderId) === String(user?._id) ||
      hasPermission(myPermissions, PERMISSIONS.MANAGE_SERVER),
    [user, myPermissions]
  );

  const onUploaded = useCallback((resource) => {
    setResources((prev) =>
      prev.some((r) => idOf(r._id) === idOf(resource._id)) ? prev : [resource, ...prev]
    );
    setTotal((t) => t + 1);
  }, []);

  const onDeleted = useCallback((resourceId) => {
    setResources((prev) => prev.filter((r) => idOf(r._id) !== resourceId));
    setTotal((t) => Math.max(0, t - 1));
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader
        icon={Sparkles}
        title="AI Study Assistant"
        subtitle="Upload resources, read them in the browser and clear your doubts with AI"
        onOpenSidebar={openSidebar}
      >
        {/* mobile pane switcher */}
        <div className="flex rounded-lg bg-cream-200 p-0.5 lg:hidden">
          {[
            { key: "resources", label: "Resources", icon: FolderOpen },
            { key: "ai", label: "AI", icon: Sparkles },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition",
                tab === key ? "bg-white text-lav-700 shadow-sm" : "text-ink-500"
              )}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </ChatHeader>

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "w-full min-w-0 flex-col border-cream-300 bg-cream-100/40 lg:flex lg:w-80 lg:shrink-0 lg:border-r",
            tab === "resources" ? "flex" : "hidden"
          )}
        >
          <ResourcePanel
            serverId={serverId}
            resources={resources}
            loading={loading}
            total={total}
            search={search}
            onSearchChange={setSearch}
            canDeleteResource={canDeleteResource}
            onPreview={setPreview}
            onUploaded={onUploaded}
            onDeleted={onDeleted}
          />
        </aside>

        <main
          className={cn(
            "min-w-0 flex-1 flex-col lg:flex",
            tab === "ai" ? "flex" : "hidden"
          )}
        >
          <AiChatPanel serverId={serverId} resources={resources} />
        </main>
      </div>

      {preview && <ResourcePreviewModal resource={preview} onClose={() => setPreview(null)} />}
    </div>
  );
};

export default StudyPage;
