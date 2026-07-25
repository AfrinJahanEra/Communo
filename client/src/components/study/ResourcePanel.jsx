import { useRef, useState } from "react";
import {
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  MoreHorizontal,
  Presentation,
  Search,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Field, Input, TextArea } from "../ui/Input";
import { Menu } from "../ui/Menu";
import { Modal } from "../ui/Modal";
import { Spinner } from "../ui/Spinner";
import { useToast } from "../../hooks/useToast";
import { apiMessage } from "../../lib/api";
import { cn, displayNameOf, formatBytes, idOf, saveBlob, timeAgo } from "../../lib/utils";
import * as resourceService from "../../services/resourceService";

/**
 * Left panel of the AI Study page: upload (click or drag-drop) + searchable
 * list of the server's shared resources. List state lives in StudyPage and
 * stays fresh through `resource:*` socket events.
 */

const ACCEPT = ".pdf,.txt,.md,.docx,.pptx,.png,.jpg,.jpeg,.webp";

const KIND_META = {
  pdf: { icon: FileText, tint: "bg-status-dnd/10 text-status-dnd" },
  text: { icon: FileText, tint: "bg-lav-100 text-lav-700" },
  document: { icon: FileText, tint: "bg-lav-100 text-lav-700" },
  slides: { icon: Presentation, tint: "bg-status-idle/15 text-status-idle" },
  image: { icon: ImageIcon, tint: "bg-status-online/10 text-status-online" },
};

const canPreview = (resource) => resource.kind === "pdf" || resource.kind === "image";

// ---------- upload ----------

const UploadModal = ({ open, onClose, serverId, onUploaded }) => {
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", tags: "" });
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(null); // null = idle, 0-100 = uploading
  const [error, setError] = useState("");

  const reset = () => {
    setFile(null);
    setForm({ title: "", description: "", tags: "" });
    setProgress(null);
    setError("");
  };

  const pick = (picked) => {
    if (!picked) return;
    setFile(picked);
    setError("");
    setForm((f) => ({ ...f, title: f.title || picked.name.replace(/\.[^.]+$/, "") }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file || !form.title.trim()) return;
    setError("");
    setProgress(0);
    try {
      const resource = await resourceService.uploadResource(
        serverId,
        {
          file,
          title: form.title.trim(),
          description: form.description.trim(),
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
        setProgress
      );
      onUploaded(resource);
      toast({ type: "success", title: "Resource shared", body: resource.title });
      reset();
      onClose();
    } catch (err) {
      setProgress(null);
      setError(apiMessage(err, "Upload failed"));
    }
  };

  const uploading = progress !== null;

  return (
    <Modal
      open={open}
      onClose={() => {
        if (uploading) return;
        reset();
        onClose();
      }}
      title="Share a resource"
    >
      <form onSubmit={submit} className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          onClick={() => !uploading && inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition",
            dragOver
              ? "border-lav-500 bg-lav-50"
              : "border-cream-300 bg-cream-100/60 hover:border-lav-300 hover:bg-lav-50/50"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <UploadCloud size={26} className="text-lav-500" />
          {file ? (
            <div>
              <p className="text-sm font-semibold text-ink-900">{file.name}</p>
              <p className="text-xs text-ink-500">{formatBytes(file.size)}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-ink-700">
                Drop a file here or <span className="text-lav-600">browse</span>
              </p>
              <p className="mt-0.5 text-xs text-ink-300">PDF, notes, docs, slides or images · up to 15 MB</p>
            </div>
          )}
        </div>

        <Field label="Title" error={error}>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. DBMS Unit 3 — Normalization notes"
            maxLength={120}
            disabled={uploading}
          />
        </Field>
        <Field label="Description (optional)">
          <TextArea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What's inside?"
            rows={2}
            maxLength={1000}
            disabled={uploading}
          />
        </Field>
        <Field label="Tags (optional)" hint="Comma separated, e.g. dbms, sql, unit-3">
          <Input
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="dbms, sql"
            disabled={uploading}
          />
        </Field>

        {uploading && (
          <div>
            <div className="h-1.5 overflow-hidden rounded-full bg-cream-300">
              <div
                className="h-full rounded-full bg-lav-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[11px] text-ink-500">
              {progress < 100 ? `Uploading… ${progress}%` : "Processing…"}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button type="submit" loading={uploading} disabled={!file || !form.title.trim()}>
            <Upload size={14} /> Share
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ---------- list ----------

const ResourceCard = ({ resource, canDelete, onPreview, onDownload, onDelete, busy }) => {
  const meta = KIND_META[resource.kind] || KIND_META.document;
  const Icon = meta.icon;

  return (
    <article className="group flex gap-2.5 rounded-xl border border-cream-300 bg-cream-50 p-2.5 transition hover:border-lav-300 hover:shadow-sm">
      <button
        onClick={() => (canPreview(resource) ? onPreview(resource) : onDownload(resource))}
        className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.tint)}
        title={canPreview(resource) ? "Preview" : "Download"}
      >
        <Icon size={18} />
      </button>

      <div className="min-w-0 flex-1">
        <button
          onClick={() => (canPreview(resource) ? onPreview(resource) : onDownload(resource))}
          className="block w-full truncate text-left text-[13px] font-semibold text-ink-900 hover:text-lav-700"
          title={resource.title}
        >
          {resource.title}
        </button>
        <p className="truncate text-[11px] text-ink-300">
          {formatBytes(resource.sizeBytes)} · {displayNameOf(resource.uploaderId)} ·{" "}
          {timeAgo(resource.createdAt)}
        </p>
        {resource.tags?.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {resource.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-lav-100 px-1.5 py-px text-[10px] font-semibold text-lav-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-start">
        {busy ? (
          <Spinner size={14} className="mt-1.5" />
        ) : (
          <Menu
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className="rounded-lg p-1.5 text-ink-300 opacity-0 transition hover:bg-cream-200 hover:text-ink-700 focus:opacity-100 group-hover:opacity-100"
                aria-label={`Actions for ${resource.title}`}
              >
                <MoreHorizontal size={14} />
              </button>
            )}
            items={[
              canPreview(resource) && {
                label: "Preview",
                icon: Eye,
                onClick: () => onPreview(resource),
              },
              { label: "Download", icon: Download, onClick: () => onDownload(resource) },
              canDelete && {
                label: "Delete",
                icon: Trash2,
                danger: true,
                onClick: () => onDelete(resource),
              },
            ]}
          />
        )}
      </div>
    </article>
  );
};

export const ResourcePanel = ({
  serverId,
  resources,
  loading,
  total,
  search,
  onSearchChange,
  canDeleteResource,
  onPreview,
  onUploaded,
  onDeleted,
}) => {
  const { toast } = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const download = async (resource) => {
    setBusyId(idOf(resource._id));
    try {
      const blob = await resourceService.downloadResource(serverId, idOf(resource._id));
      saveBlob(blob, resource.originalName || resource.title);
    } catch (err) {
      toast({ type: "error", title: "Download failed", body: apiMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (resource) => {
    if (!window.confirm(`Delete "${resource.title}"? This cannot be undone.`)) return;
    setBusyId(idOf(resource._id));
    try {
      await resourceService.deleteResource(serverId, idOf(resource._id));
      onDeleted(idOf(resource._id));
    } catch (err) {
      toast({ type: "error", title: "Delete failed", body: apiMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-2 p-3 pb-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-300">
            Resources{total > 0 && ` · ${total}`}
          </p>
          <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
            <Upload size={13} /> Upload
          </Button>
        </div>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search resources…"
            className="rounded-xl py-2 pl-9 pr-8 text-[13px]"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-300 hover:text-ink-700"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size={22} />
          </div>
        ) : resources.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={search ? "No matches" : "No resources yet"}
            body={
              search
                ? "Try a different search term or tag."
                : "Share notes, PDFs and slides so everyone can study — and ask the AI about them."
            }
            action={
              !search && (
                <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
                  <Upload size={13} /> Upload the first one
                </Button>
              )
            }
          />
        ) : (
          resources.map((resource) => (
            <ResourceCard
              key={idOf(resource._id)}
              resource={resource}
              canDelete={canDeleteResource(resource)}
              onPreview={onPreview}
              onDownload={download}
              onDelete={remove}
              busy={busyId === idOf(resource._id)}
            />
          ))
        )}
      </div>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        serverId={serverId}
        onUploaded={onUploaded}
      />
    </div>
  );
};
