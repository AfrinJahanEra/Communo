import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input, TextArea } from "../ui/Input";
import { useToast } from "../../hooks/useToast";
import { apiMessage } from "../../lib/api";
import { createServer } from "../../services/serverService";

export const CreateServerModal = ({ open, onClose, onCreated }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", description: "", isPublic: false, tags: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setForm({ name: "", description: "", isPublic: false, tags: "" });
    setError("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (name.length < 2) {
      setError("Server name must be at least 2 characters");
      return;
    }
    setSubmitting(true);
    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 10);
      const server = await createServer({
        name,
        description: form.description.trim(),
        isPublic: form.isPublic,
        tags,
      });
      toast({ type: "success", title: `Welcome to ${server.name}!` });
      onCreated?.(server);
      close();
      navigate(`/app/servers/${server._id}`);
    } catch (err) {
      setError(apiMessage(err, "Could not create the server"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Create a server">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-xl border border-status-dnd/30 bg-status-dnd/10 px-3.5 py-2.5 text-sm text-status-dnd">
            {error}
          </div>
        )}
        <Field label="Server name">
          <Input
            autoFocus
            placeholder="CSE Batch '27"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            maxLength={100}
          />
        </Field>
        <Field label="Description" hint="Optional — what is this server about?">
          <TextArea
            placeholder="A place to discuss assignments, projects and everything CSE."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            maxLength={500}
          />
        </Field>
        <Field label="Tags" hint="Comma-separated, e.g. algorithms, webdev (max 10)">
          <Input
            placeholder="algorithms, webdev"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          />
        </Field>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cream-300 bg-cream-100/60 p-3.5">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
            className="mt-0.5 h-4 w-4 accent-lav-500"
          />
          <span>
            <span className="block text-sm font-semibold text-ink-900">Public server</span>
            <span className="block text-xs text-ink-500">
              Anyone can find it in Discover and join without an invite.
            </span>
          </span>
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Create server
          </Button>
        </div>
      </form>
    </Modal>
  );
};
