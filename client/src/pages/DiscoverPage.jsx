import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Compass, Search, Users } from "lucide-react";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { useToast } from "../hooks/useToast";
import { apiMessage } from "../lib/api";
import { cn, initials } from "../lib/utils";
import { discoverServers, joinPublicServer } from "../services/serverService";

const ServerCard = ({ server, isMember, joining, onJoin, onOpen }) => (
  <li className="card flex flex-col gap-3 p-5 transition hover:border-lav-300 hover:shadow-md">
    <div className="flex items-center gap-3">
      {server.icon ? (
        <img src={server.icon} alt={server.name} className="h-12 w-12 rounded-2xl object-cover" />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lav-200 text-base font-bold text-lav-800">
          {initials(server.name)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink-900">{server.name}</p>
        <p className="flex items-center gap-1 text-xs text-ink-300">
          <Users size={12} />
          {server.memberCount} member{server.memberCount === 1 ? "" : "s"}
        </p>
      </div>
    </div>

    <p className="line-clamp-2 min-h-[2rem] flex-1 text-xs leading-relaxed text-ink-500">
      {server.description || "No description yet."}
    </p>

    {server.tags?.length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        {server.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-lav-100 px-2 py-0.5 text-[10px] font-semibold text-lav-700"
          >
            #{tag}
          </span>
        ))}
      </div>
    )}

    {isMember ? (
      <Button variant="outline" size="sm" onClick={onOpen}>
        Open
      </Button>
    ) : (
      <Button size="sm" loading={joining} onClick={onJoin}>
        Join server
      </Button>
    )}
  </li>
);

/** Public server discovery: search + join communities. */
const DiscoverPage = () => {
  const { servers: myServers, refreshServers } = useOutletContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [joiningId, setJoiningId] = useState(null);

  const myServerIds = useMemo(
    () => new Set((myServers || []).map((s) => s._id)),
    [myServers]
  );

  // Debounced search against GET /servers/discover
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      const params = query.trim() ? { search: query.trim() } : {};
      discoverServers(params)
        .then((data) => {
          if (!alive) return;
          setResults(data.servers || []);
          setError(null);
        })
        .catch((err) => {
          if (!alive) return;
          setResults([]);
          setError(apiMessage(err, "Could not load public servers"));
        });
    }, query ? 350 : 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  const join = async (server) => {
    setJoiningId(server._id);
    try {
      await joinPublicServer(server._id);
      await refreshServers();
      toast({ type: "success", title: `Welcome to ${server.name}!` });
      navigate(`/app/servers/${server._id}`);
    } catch (err) {
      toast({ type: "error", title: "Could not join server", body: apiMessage(err) });
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      {/* Hero */}
      <div className="border-b border-cream-300 bg-gradient-to-br from-lav-100 via-cream-50 to-cream-100 px-4 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-4xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-lav-600">
            <Compass size={14} /> Discover
          </p>
          <h1 className="mt-1.5 text-2xl font-extrabold text-ink-900 sm:text-3xl">
            Find your study community
          </h1>
          <p className="mt-1 max-w-lg text-sm text-ink-500">
            Browse public servers created by fellow CSE students — algorithms, web dev,
            interview prep and more.
          </p>

          <div className="relative mt-5 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search servers by name…"
              className={cn(
                "w-full rounded-2xl border border-cream-300 bg-white py-2.5 pl-10 pr-4 text-sm",
                "text-ink-900 placeholder:text-ink-300 outline-none transition",
                "focus:border-lav-400 focus:ring-2 focus:ring-lav-200"
              )}
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-8">
        {results === null ? (
          <div className="flex justify-center py-16">
            <Spinner size={22} />
          </div>
        ) : error ? (
          <EmptyState icon={Compass} title="Something went wrong" body={error} />
        ) : results.length === 0 ? (
          <EmptyState
            icon={Compass}
            title={query ? `No servers match “${query.trim()}”` : "No public servers yet"}
            body={
              query
                ? "Try a different search term."
                : "Be the first — create a server and make it public so classmates can find it."
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((server) => (
              <ServerCard
                key={server._id}
                server={server}
                isMember={myServerIds.has(server._id)}
                joining={joiningId === server._id}
                onJoin={() => join(server)}
                onOpen={() => navigate(`/app/servers/${server._id}`)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DiscoverPage;
