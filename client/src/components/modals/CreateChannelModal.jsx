import { useState } from "react";
import { Hash, Megaphone, Volume2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Input";
import { useToast } from "../../hooks/useToast";
import { apiMessage } from "../../lib/api";
import { cn } from "../../lib/utils";
import { createChannel } from "../../services/channelService";

const TYPES = [
  { value: "text", label: "Text", icon: Hash, hint: "Messages, threads and code" },
  { value: "announcement", label: "Announcement", icon: Megaphone, hint: "Important updates" },
  { value: "voice", label: "Voice", icon: Volume2, hint: "Study room with audio" },
];

export const CreateChannelModal = ({ open, onClose, serverId, roles, onCreated }) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    type: "text",
    topic: "",
    isPrivate: false,
    allowedRoleIds: [],
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const assignableRoles = (roles || []).filter((r) => !r.isDefault);

  const close = () => {
    setForm({ name: "", type: "text", topic: "", isPrivate: false, allowedRoleIds: [] });
    setError("");
    onClose();
  };

  const toggleRole = (roleId) =>
    setForm((f) => ({
      ...f,
      allowedRoleIds: f.allowedRoleIds.includes(roleId)
        ? f.allowedRoleIds.filter((id) => id !== roleId)
        : [...f.allowedRoleIds, roleId],
    }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError("Channel name is required");
      return;
    }
    if (!/^[a-z0-9-\s]+$/i.test(name)) {
      setError("Only letters, numbers, spaces and dashes are allowed");
      return;
    }
    setSubmitting(true);
    try {
      const channel = await createChannel(serverId, {
        name,
        type: form.type,
        topic: form.topic.trim(),
        isPrivate: form.isPrivate,
        allowedRoleIds: form.isPrivate ? form.allowedRoleIds : [],
      });
      toast({ type: "success", title: `#${channel.name} created` });
      onCreated?.(channel);
      close();
    } catch (err) {
      setError(apiMessage(err, "Could not create the channel"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Create a channel">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-xl border border-status-dnd/30 bg-status-dnd/10 px-3.5 py-2.5 text-sm text-status-dnd">
            {error}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-3">
          {TYPES.map(({ value, label, icon: Icon, hint }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: value }))}
              className={cn(
                "rounded-xl border p-3 text-left transition",
                form.type === value
                  ? "border-lav-500 bg-lav-50 ring-2 ring-lav-200"
                  : "border-cream-300 hover:border-lav-300"
              )}
            >
              <Icon size={17} className={form.type === value ? "text-lav-600" : "text-ink-500"} />
              <p className="mt-1.5 text-sm font-semibold text-ink-900">{label}</p>
              <p className="text-[11px] leading-tight text-ink-500">{hint}</p>
            </button>
          ))}
        </div>

        <Field label="Channel name" hint="Spaces become dashes, e.g. “Study Hall” → study-hall">
          <Input
            autoFocus
            placeholder="general"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            maxLength={50}
          />
        </Field>

        <Field label="Topic" hint="Optional">
          <Input
            placeholder="What's this channel about?"
            value={form.topic}
            onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            maxLength={1024}
          />
        </Field>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cream-300 bg-cream-100/60 p-3.5">
          <input
            type="checkbox"
            checked={form.isPrivate}
            onChange={(e) => setForm((f) => ({ ...f, isPrivate: e.target.checked }))}
            className="mt-0.5 h-4 w-4 accent-lav-500"
          />
          <span>
            <span className="block text-sm font-semibold text-ink-900">Private channel</span>
            <span className="block text-xs text-ink-500">
              Only selected roles (and admins) can see this channel.
            </span>
          </span>
        </label>

        {form.isPrivate && (
          <div className="rounded-xl border border-cream-300 p-3.5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-300">
              Allowed roles
            </p>
            {assignableRoles.length === 0 ? (
              <p className="text-xs text-ink-500">
                No custom roles yet — create roles in Server settings first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {assignableRoles.map((role) => (
                  <button
                    key={role._id}
                    type="button"
                    onClick={() => toggleRole(role._id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition",
                      form.allowedRoleIds.includes(role._id)
                        ? "border-lav-500 bg-lav-500 text-white"
                        : "border-cream-300 text-ink-700 hover:border-lav-300"
                    )}
                  >
                    {role.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Create channel
          </Button>
        </div>
      </form>
    </Modal>
  );
};
