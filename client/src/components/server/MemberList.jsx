import { useMemo } from "react";
import { Crown } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { usePresence } from "../../hooks/usePresence";
import { cn, displayNameOf, idOf } from "../../lib/utils";

const MemberRow = ({ member, isOwner, offline }) => {
  const user = member.userId;
  return (
    <li
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-cream-200/70",
        offline && "opacity-50"
      )}
    >
      <Avatar user={user} size="sm" showStatus />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-700">
        {member.nickname || displayNameOf(user)}
      </span>
      {isOwner && <Crown size={13} className="shrink-0 text-status-idle" title="Server owner" />}
    </li>
  );
};

/** Right-side member panel grouped by online/offline via live presence. */
export const MemberList = ({ server, members }) => {
  const { statusOf } = usePresence();

  const { online, offline } = useMemo(() => {
    const online = [];
    const offline = [];
    for (const member of members) {
      const status = statusOf(idOf(member.userId));
      (status && status !== "offline" ? online : offline).push(member);
    }
    const byName = (a, b) =>
      displayNameOf(a.userId).localeCompare(displayNameOf(b.userId));
    return { online: online.sort(byName), offline: offline.sort(byName) };
  }, [members, statusOf]);

  return (
    <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-l border-cream-300 bg-cream-100/60 p-3 lg:flex">
      {online.length > 0 && (
        <>
          <p className="px-2 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-ink-300">
            Online — {online.length}
          </p>
          <ul className="space-y-0.5">
            {online.map((m) => (
              <MemberRow
                key={m._id}
                member={m}
                isOwner={idOf(m.userId) === idOf(server.ownerId)}
              />
            ))}
          </ul>
        </>
      )}
      {offline.length > 0 && (
        <>
          <p className="px-2 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-ink-300">
            Offline — {offline.length}
          </p>
          <ul className="space-y-0.5">
            {offline.map((m) => (
              <MemberRow
                key={m._id}
                member={m}
                isOwner={idOf(m.userId) === idOf(server.ownerId)}
                offline
              />
            ))}
          </ul>
        </>
      )}
    </aside>
  );
};
