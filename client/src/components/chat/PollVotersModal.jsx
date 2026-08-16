import { Modal } from "../ui/Modal";
import { Avatar } from "../ui/Avatar";
import { displayNameOf, idOf } from "../../lib/utils";

/** Shows who voted for one poll option. */
export const PollVotersModal = ({ open, onClose, option, voters = [] }) => (
  <Modal open={open} onClose={onClose} title={option ? `Votes for "${option.text}"` : "Votes"} size="sm">
    {voters.length > 0 ? (
      <ul className="space-y-2.5">
        {voters.map((user) => (
          <li key={idOf(user)} className="flex items-center gap-2.5">
            <Avatar user={user} size="sm" />
            <span className="truncate text-sm font-medium text-ink-800">{displayNameOf(user)}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="py-4 text-center text-sm text-ink-300">No one has voted for this option yet.</p>
    )}
  </Modal>
);
