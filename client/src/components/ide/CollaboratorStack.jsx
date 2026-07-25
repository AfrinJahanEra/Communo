import { Avatar } from "../ui/Avatar";
import { idOf } from "../../lib/utils";

/**
 * Overlapping avatar stack for live collaborators, ringed with each
 * user's editor cursor color.
 */
export const CollaboratorStack = ({ participants, max = 4, size = "xs" }) => {
  if (!participants.length) return null;
  const shown = participants.slice(0, max);
  const extra = participants.length - shown.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-1.5">
        {shown.map((p) => (
          <span
            key={idOf(p.userId)}
            className="rounded-full ring-2"
            style={{ "--tw-ring-color": p.color }}
            title={p.displayName || p.username}
          >
            <Avatar user={{ _id: idOf(p.userId), username: p.username, displayName: p.displayName, avatar: p.avatar }} size={size} />
          </span>
        ))}
      </div>
      {extra > 0 && (
        <span className="ml-1.5 text-[11px] font-semibold text-ink-500">+{extra}</span>
      )}
    </div>
  );
};
