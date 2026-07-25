import { useEffect, useState } from "react";
import { Check, Copy, Link2, Trash2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Select } from "../ui/Input";
import { useToast } from "../../hooks/useToast";
import { apiMessage } from "../../lib/api";
import { createInvite, listInvites, revokeInvite } from "../../services/serverService";

const EXPIRY_OPTIONS = [
  { label: "Never expires", value: "" },
  { label: "1 hour", value: "1" },
  { label: "12 hours", value: "12" },
  { label: "1 day", value: "24" },
  { label: "7 days", value: "168" },
];

const MAX_USES_OPTIONS = [
  { label: "Unlimited uses", value: "0" },
  { label: "1 use", value: "1" },
  { label: "10 uses", value: "10" },
  { label: "50 uses", value: "50" },
];

const inviteUrl = (code) => `${window.location.origin}/invite/${code}`;

/** Create + manage invite links for a server. */
export const InviteModal = ({ open, onClose, server, canManage }) => {
  const { toast } = useToast();
  const [expires, setExpires] = useState("168");
  const [maxUses, setMaxUses] = useState("0");
  const [invite, setInvite] = useState(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [existing, setExisting] = useState([]);

  useEffect(() => {
    if (!open || !canManage || !server?._id) return;
    let alive = true;
    listInvites(server._id)
      .then((list) => alive && setExisting(list))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open, canManage, server?._id]);

  const onCreate = async () => {
    setCreating(true);
    try {
      const payload = { maxUses: Number(maxUses) };
      if (expires) payload.expiresInHours = Number(expires);
      const created = await createInvite(server._id, payload);
      setInvite(created);
      setCopied(false);
      if (canManage) setExisting((prev) => [created, ...prev]);
    } catch (err) {
      toast({ type: "error", title: "Could not create invite", body: apiMessage(err) });
    } finally {
      setCreating(false);
    }
  };

  const onCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(code));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ type: "error", title: "Copy failed", body: "Select and copy the link manually." });
    }
  };

  const onRevoke = async (code) => {
    try {
      await revokeInvite(code);
      setExisting((prev) => prev.filter((i) => i.code !== code));
      if (invite?.code === code) setInvite(null);
      toast({ type: "success", title: "Invite revoked" });
    } catch (err) {
      toast({ type: "error", title: "Could not revoke invite", body: apiMessage(err) });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Invite people to ${server?.name ?? ""}`}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Expires after">
            <Select value={expires} onChange={(e) => setExpires(e.target.value)}>
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Max uses">
            <Select value={maxUses} onChange={(e) => setMaxUses(e.target.value)}>
              {MAX_USES_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Button onClick={onCreate} loading={creating} className="w-full">
          <Link2 size={16} /> Generate invite link
        </Button>

        {invite && (
          <div className="flex items-center gap-2 rounded-xl border border-lav-300 bg-lav-50 p-3">
            <code className="min-w-0 flex-1 truncate font-mono text-xs text-lav-800">
              {inviteUrl(invite.code)}
            </code>
            <Button size="sm" variant={copied ? "outline" : "primary"} onClick={() => onCopy(invite.code)}>
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}

        {canManage && existing.length > 0 && (
          <div className="border-t border-cream-300 pt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-300">
              Active invites
            </p>
            <ul className="space-y-1.5">
              {existing.map((inv) => (
                <li
                  key={inv.code}
                  className="flex items-center gap-2 rounded-lg bg-cream-100 px-3 py-2 text-xs"
                >
                  <code className="font-mono font-semibold text-ink-700">{inv.code}</code>
                  <span className="text-ink-300">
                    {inv.uses ?? 0}{inv.maxUses ? `/${inv.maxUses}` : ""} uses
                  </span>
                  <span className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => onCopy(inv.code)}
                      className="rounded p-1.5 text-ink-500 transition hover:bg-cream-300 hover:text-ink-900"
                      title="Copy link"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={() => onRevoke(inv.code)}
                      className="rounded p-1.5 text-ink-500 transition hover:bg-status-dnd/10 hover:text-status-dnd"
                      title="Revoke"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};
