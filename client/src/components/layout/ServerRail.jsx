import { Link, useParams } from "react-router-dom";
import { Compass, House, Plus } from "lucide-react";
import { cn, initials } from "../../lib/utils";

const RailButton = ({ to, active, label, className, children }) => (
  <Link
    to={to}
    title={label}
    className={cn(
      "group relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-150",
      active ? "rounded-xl bg-lav-500 text-white shadow-md" : "bg-cream-50 text-lav-700 hover:rounded-xl hover:bg-lav-500 hover:text-white",
      className
    )}
  >
    {/* active pill */}
    <span
      className={cn(
        "absolute -left-2.5 w-1 rounded-r-full bg-lav-700 transition-all duration-150",
        active ? "h-7" : "h-0 group-hover:h-4"
      )}
    />
    {children}
  </Link>
);

/** Far-left vertical navigation: home, joined servers, create, discover. */
export const ServerRail = ({ servers, onCreate }) => {
  const { serverId } = useParams();

  return (
    <nav className="flex h-full w-[68px] shrink-0 flex-col items-center gap-2 overflow-y-auto border-r border-cream-300 bg-cream-200 py-3">
      <RailButton to="/app" active={!serverId} label="Home & friends">
        <House size={20} />
      </RailButton>

      <div className="my-1 h-px w-8 bg-cream-400" />

      {servers.map((server) => {
        const active = serverId === server._id;
        return (
          <RailButton
            key={server._id}
            to={`/app/servers/${server._id}`}
            active={active}
            label={server.name}
          >
            {server.icon ? (
              <img src={server.icon} alt={server.name} className="h-full w-full rounded-[inherit] object-cover" />
            ) : (
              <span className="text-sm font-bold">{initials(server.name)}</span>
            )}
          </RailButton>
        );
      })}

      <button
        onClick={onCreate}
        title="Create a server"
        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cream-50 text-status-online transition-all duration-150 hover:rounded-xl hover:bg-status-online hover:text-white"
      >
        <Plus size={20} />
      </button>

      <RailButton to="/app/discover" label="Discover servers" className="mt-auto">
        <Compass size={20} />
      </RailButton>
    </nav>
  );
};
