import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Server,
  Search,
  ChevronLeft,
  ChevronRight,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "../hooks/useAuth";
import { apiMessage } from "../lib/api";
import { displayNameOf } from "../lib/utils";
import * as adminService from "../services/adminService";

/**
 * Small data-fetching helper: state updates only happen inside promise
 * callbacks (or event handlers via reload), never synchronously in an effect.
 * `key` re-triggers the fetch; stale responses are discarded by request id.
 */
const useAdminQuery = (fetcher, key) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  const requestRef = useRef(0);

  // Keep the latest fetcher without re-triggering the query effect
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    const id = ++requestRef.current;
    fetcherRef.current()
      .then((res) => {
        if (requestRef.current !== id) return;
        setData(res);
        setError("");
        setPending(false);
      })
      .catch((err) => {
        if (requestRef.current !== id) return;
        setError(apiMessage(err, "Something went wrong"));
        setPending(false);
      });
  }, [key, tick]);

  const reload = useCallback(() => {
    setPending(true);
    setTick((t) => t + 1);
  }, []);

  return { data, error, pending, reload };
};

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "users", label: "Users", icon: Users },
  { key: "servers", label: "Servers", icon: Server },
];

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

const Badge = ({ tone, children }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
      tone === "ok"
        ? "bg-status-online/10 text-emerald-700"
        : tone === "warn"
          ? "bg-status-idle/15 text-amber-700"
          : tone === "bad"
            ? "bg-status-dnd/10 text-status-dnd"
            : "bg-lav-100 text-lav-700"
    }`}
  >
    {children}
  </span>
);

const StatCard = ({ label, value, hint }) => (
  <div className="rounded-2xl border border-ink-200/60 bg-white p-5">
    <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</p>
    <p className="mt-2 text-3xl font-bold text-ink-900">{value ?? "—"}</p>
    {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
  </div>
);

const SectionHeader = ({ title, subtitle, onRefresh, refreshing }) => (
  <div className="mb-6 flex items-end justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
      <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
    </div>
    {onRefresh && (
      <Button variant="outline" size="sm" loading={refreshing} onClick={onRefresh}>
        <RefreshCw size={14} className="mr-1.5" />
        Refresh
      </Button>
    )}
  </div>
);

const Pagination = ({ page, pages, onPage }) => (
  <div className="mt-4 flex items-center justify-between text-sm text-ink-500">
    <span>
      Page {page} of {pages}
    </span>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft size={14} />
      </Button>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        <ChevronRight size={14} />
      </Button>
    </div>
  </div>
);

const ErrorNote = ({ message, onRetry }) => (
  <div className="flex items-center justify-between rounded-xl border border-status-dnd/30 bg-status-dnd/10 px-4 py-3 text-sm text-status-dnd">
    <span>{message}</span>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    )}
  </div>
);

const SearchBox = ({ value, onChange, placeholder }) => (
  <div className="relative mb-4 max-w-sm">
    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full rounded-xl border border-ink-200/70 bg-white py-2 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-lav-400 focus:outline-none focus:ring-2 focus:ring-lav-200"
    />
  </div>
);

/* ---------------- Sections ---------------- */

const OverviewSection = () => {
  const { data, error, pending, reload } = useAdminQuery(
    () => adminService.getOverview(),
    "overview"
  );
  const overview = data?.overview || null;

  return (
    <>
      <SectionHeader
        title="Overview"
        subtitle="A snapshot of activity across the platform."
        onRefresh={reload}
        refreshing={pending}
      />
      {error ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : pending ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        overview && (
          <div className="space-y-8">
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">People</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Total users" value={overview.users.total} />
                <StatCard label="Verified users" value={overview.users.verified} hint="Confirmed their email" />
                <StatCard label="New this week" value={overview.users.newThisWeek} hint="Last 7 days" />
              </div>
            </div>
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Content</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Servers" value={overview.servers.total} />
                <StatCard label="Channels" value={overview.channels.total} />
                <StatCard
                  label="Messages"
                  value={overview.messages.total}
                  hint={`${overview.messages.channel} in channels, ${overview.messages.direct} direct`}
                />
              </div>
            </div>
          </div>
        )
      )}
    </>
  );
};

const UsersSection = () => {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, error, pending, reload } = useAdminQuery(
    () => adminService.listUsers({ search: debounced, page }),
    `${debounced}:${page}`
  );

  const users = data?.users || [];

  return (
    <>
      <SectionHeader title="Users" subtitle="Everyone registered on the platform." />
      <SearchBox
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder="Search by name, username or email"
      />
      {error ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : pending ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : users.length === 0 ? (
        <p className="rounded-xl border border-ink-200/60 bg-white px-4 py-8 text-center text-sm text-ink-400">
          No users found.
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-ink-200/60 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200/60 text-left text-xs uppercase tracking-wider text-ink-400">
                  <th className="px-4 py-3 font-semibold">Member</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Verification</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-b border-ink-100/70 last:border-0 hover:bg-cream-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar user={u} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink-900">{displayNameOf(u)}</p>
                          <p className="truncate text-xs text-ink-400">@{u.username}</p>
                        </div>
                        {u.role === "admin" && <Badge tone="lav">Admin</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.isEmailVerified ? <Badge tone="ok">Verified</Badge> : <Badge tone="warn">Unverified</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      {u.isActive ? <Badge tone="ok">Active</Badge> : <Badge tone="bad">Deactivated</Badge>}
                    </td>
                    <td className="px-4 py-3 text-ink-500">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onPage={setPage} />
        </>
      )}
    </>
  );
};

const ServersSection = () => {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, error, pending, reload } = useAdminQuery(
    () => adminService.listServers({ search: debounced, page }),
    `${debounced}:${page}`
  );

  const servers = data?.servers || [];

  return (
    <>
      <SectionHeader title="Servers" subtitle="Every community created on the platform." />
      <SearchBox
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder="Search servers by name"
      />
      {error ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : pending ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : servers.length === 0 ? (
        <p className="rounded-xl border border-ink-200/60 bg-white px-4 py-8 text-center text-sm text-ink-400">
          No servers found.
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-ink-200/60 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200/60 text-left text-xs uppercase tracking-wider text-ink-400">
                  <th className="px-4 py-3 font-semibold">Server</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Members</th>
                  <th className="px-4 py-3 font-semibold">Channels</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {servers.map((s) => (
                  <tr key={s._id} className="border-b border-ink-100/70 last:border-0 hover:bg-cream-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink-900">{s.name}</p>
                      {s.description && <p className="mt-0.5 line-clamp-1 text-xs text-ink-400">{s.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {s.ownerId ? displayNameOf(s.ownerId) : "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-ink-600">{s.memberCount}</td>
                    <td className="px-4 py-3 text-ink-600">{s.channelCount}</td>
                    <td className="px-4 py-3 text-ink-500">{formatDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onPage={setPage} />
        </>
      )}
    </>
  );
};

/* ---------------- Page ---------------- */

const AdminPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState("overview");

  const onLogout = useCallback(async () => {
    await logout();
    navigate("/", { replace: true });
  }, [logout, navigate]);

  return (
    <div className="flex h-screen bg-cream-50">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-ink-200/60 bg-white">
        <div className="border-b border-ink-100 px-5 py-5">
          <Link to="/">
            <Logo />
          </Link>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
            Admin Console
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                section === key
                  ? "bg-lav-100 text-lav-800"
                  : "text-ink-500 hover:bg-cream-100 hover:text-ink-800"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="border-t border-ink-100 p-4">
          <div className="flex items-center gap-3">
            <Avatar user={user} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">{displayNameOf(user)}</p>
              <p className="truncate text-xs text-ink-400">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={onLogout}>
            <LogOut size={14} className="mr-1.5" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-10">
          {section === "overview" && <OverviewSection />}
          {section === "users" && <UsersSection />}
          {section === "servers" && <ServersSection />}
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
