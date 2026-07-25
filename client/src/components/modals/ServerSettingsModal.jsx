import { useMemo, useState } from "react";
import { Crown, Plus, Save, Trash2, UserMinus } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input, TextArea } from "../ui/Input";
import { Avatar } from "../ui/Avatar";
import { useToast } from "../../hooks/useToast";
import { apiMessage } from "../../lib/api";
import { cn, displayNameOf, idOf } from "../../lib/utils";
import { hasPermission, PERMISSIONS, PERMISSION_LABELS } from "../../lib/permissions";
import * as serverService from "../../services/serverService";

const TABS = [
  { id: "overview", label: "Overview", perm: PERMISSIONS.MANAGE_SERVER },
  { id: "roles", label: "Roles", perm: PERMISSIONS.MANAGE_ROLES },
  { id: "members", label: "Members", perm: null },
];

// ---------- Overview ----------

const OverviewTab = ({ server, isOwner, members, onChanged, onClose }) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: server.name,
    description: server.description || "",
    isPublic: !!server.isPublic,
    tags: (server.tags || []).join(", "),
  });
  const [saving, setSaving] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState("");

  const save = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      toast({ type: "error", title: "Server name must be at least 2 characters" });
      return;
    }
    setSaving(true);
    try {
      await serverService.updateServer(server._id, {
        name: form.name.trim(),
        description: form.description.trim(),
        isPublic: form.isPublic,
        tags: form.tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 10),
      });
      toast({ type: "success", title: "Server updated" });
      onChanged();
    } catch (err) {
      toast({ type: "error", title: "Could not update server", body: apiMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const transfer = async () => {
    if (!newOwnerId) return;
    const target = members.find((m) => idOf(m.userId) === newOwnerId);
    if (!window.confirm(`Transfer ownership to ${displayNameOf(target?.userId)}? You cannot undo this.`)) return;
    try {
      await serverService.transferOwnership(server._id, newOwnerId);
      toast({ type: "success", title: "Ownership transferred" });
      onChanged();
      onClose();
    } catch (err) {
      toast({ type: "error", title: "Transfer failed", body: apiMessage(err) });
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="space-y-4">
        <Field label="Server name">
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={100} />
        </Field>
        <Field label="Description">
          <TextArea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            maxLength={500}
          />
        </Field>
        <Field label="Tags" hint="Comma-separated, max 10">
          <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
        </Field>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-cream-300 bg-cream-100/60 p-3.5">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
            className="h-4 w-4 accent-lav-500"
          />
          <span className="text-sm font-semibold text-ink-900">Listed in Discover (public)</span>
        </label>
        <Button type="submit" loading={saving}>
          <Save size={15} /> Save changes
        </Button>
      </form>

      {isOwner && (
        <div className="space-y-3 border-t border-cream-300 pt-5">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-status-dnd">
            <Crown size={13} /> Transfer ownership
          </h4>
          <div className="flex gap-2">
            <select
              className="input-base flex-1"
              value={newOwnerId}
              onChange={(e) => setNewOwnerId(e.target.value)}
            >
              <option value="">Choose a member…</option>
              {members
                .filter((m) => idOf(m.userId) !== idOf(server.ownerId))
                .map((m) => (
                  <option key={m._id} value={idOf(m.userId)}>
                    {displayNameOf(m.userId)}
                  </option>
                ))}
            </select>
            <Button variant="danger" onClick={transfer} disabled={!newOwnerId}>
              Transfer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- Roles ----------

const EMPTY_ROLE = { name: "", color: "#8f7ab8", permissions: 0 };

const RolesTab = ({ server, roles, onChanged }) => {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_ROLE);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => [...roles].sort((a, b) => (b.position ?? 0) - (a.position ?? 0)), [roles]);
  const selected = roles.find((r) => r._id === selectedId);
  const isNew = selectedId === "new";

  // Re-seed the draft during render whenever the selection changes.
  const [prevSelectedId, setPrevSelectedId] = useState(null);
  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId);
    if (selected) {
      setDraft({ name: selected.name, color: selected.color || "#8f7ab8", permissions: selected.permissions });
    } else if (isNew) {
      setDraft(EMPTY_ROLE);
    }
  }

  const togglePerm = (bit) =>
    setDraft((d) => ({ ...d, permissions: d.permissions & bit ? d.permissions & ~bit : d.permissions | bit }));

  const save = async () => {
    if (!draft.name.trim()) {
      toast({ type: "error", title: "Role name is required" });
      return;
    }
    setSaving(true);
    try {
      const payload = { name: draft.name.trim(), color: draft.color, permissions: draft.permissions >>> 0 };
      if (isNew) {
        await serverService.createRole(server._id, payload);
        toast({ type: "success", title: "Role created" });
      } else {
        await serverService.updateRole(server._id, selectedId, payload);
        toast({ type: "success", title: "Role updated" });
      }
      setSelectedId(null);
      onChanged();
    } catch (err) {
      toast({ type: "error", title: "Could not save role", body: apiMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (role) => {
    if (!window.confirm(`Delete role "${role.name}"?`)) return;
    try {
      await serverService.deleteRole(server._id, role._id);
      if (selectedId === role._id) setSelectedId(null);
      toast({ type: "success", title: "Role deleted" });
      onChanged();
    } catch (err) {
      toast({ type: "error", title: "Could not delete role", body: apiMessage(err) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {sorted.map((role) => (
          <button
            key={role._id}
            onClick={() => setSelectedId(role._id)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              selectedId === role._id ? "border-lav-500 bg-lav-50" : "border-cream-300 hover:border-lav-300"
            )}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: role.color || "#8f7ab8" }} />
            {role.name}
            {role.isDefault && <span className="text-[10px] font-normal text-ink-300">(everyone)</span>}
          </button>
        ))}
        <button
          onClick={() => setSelectedId("new")}
          className="flex items-center gap-1 rounded-full border border-dashed border-lav-400 px-3 py-1.5 text-xs font-semibold text-lav-600 transition hover:bg-lav-50"
        >
          <Plus size={13} /> New role
        </button>
      </div>

      {(selected || isNew) && (
        <div className="space-y-4 rounded-xl border border-cream-300 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Role name">
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                maxLength={50}
                disabled={selected?.isDefault}
              />
            </Field>
            <Field label="Color">
              <input
                type="color"
                value={draft.color}
                onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
                className="h-10 w-14 cursor-pointer rounded-lg border border-cream-300 bg-white"
              />
            </Field>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-300">Permissions</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {PERMISSION_LABELS.map(({ bit, label }) => (
                <label
                  key={bit}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink-700 transition hover:bg-cream-100"
                >
                  <input
                    type="checkbox"
                    checked={(draft.permissions & bit) !== 0}
                    onChange={() => togglePerm(bit)}
                    className="h-4 w-4 accent-lav-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            {!isNew && !selected?.isDefault ? (
              <Button variant="danger" size="sm" onClick={() => remove(selected)}>
                <Trash2 size={13} /> Delete role
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={save} loading={saving}>
              {isNew ? "Create role" : "Save role"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- Members ----------

const MembersTab = ({ server, roles, members, myPermissions, isOwner, onChanged }) => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const canManageRoles = hasPermission(myPermissions, PERMISSIONS.MANAGE_ROLES);
  const canKick = hasPermission(myPermissions, PERMISSIONS.KICK_MEMBERS);
  const assignableRoles = roles.filter((r) => !r.isDefault);

  const filtered = members.filter((m) => {
    const u = m.userId;
    const text = `${u?.username || ""} ${u?.displayName || ""} ${m.nickname || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const toggleRole = async (member, roleId) => {
    const current = (member.roleIds || []).map((r) => idOf(r));
    const next = current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId];
    try {
      await serverService.setMemberRoles(server._id, idOf(member.userId), next);
      onChanged();
    } catch (err) {
      toast({ type: "error", title: "Could not update roles", body: apiMessage(err) });
    }
  };

  const kick = async (member) => {
    if (!window.confirm(`Kick ${displayNameOf(member.userId)} from ${server.name}?`)) return;
    try {
      await serverService.kickMember(server._id, idOf(member.userId));
      toast({ type: "success", title: "Member kicked" });
      onChanged();
    } catch (err) {
      toast({ type: "error", title: "Could not kick member", body: apiMessage(err) });
    }
  };

  return (
    <div className="space-y-3">
      <Input placeholder="Search members…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <ul className="space-y-2">
        {filtered.map((member) => {
          const uid = idOf(member.userId);
          const isServerOwner = uid === idOf(server.ownerId);
          const memberRoleIds = (member.roleIds || []).map((r) => idOf(r));
          return (
            <li key={member._id} className="rounded-xl border border-cream-300 p-3">
              <div className="flex items-center gap-3">
                <Avatar user={member.userId} size="sm" showStatus />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink-900">
                    {member.nickname || displayNameOf(member.userId)}
                    {isServerOwner && <Crown size={13} className="shrink-0 text-status-idle" />}
                  </p>
                  <p className="truncate text-xs text-ink-500">@{member.userId?.username}</p>
                </div>
                {canKick && !isServerOwner && (
                  <button
                    onClick={() => kick(member)}
                    className="rounded-lg p-2 text-ink-300 transition hover:bg-status-dnd/10 hover:text-status-dnd"
                    title="Kick member"
                  >
                    <UserMinus size={15} />
                  </button>
                )}
              </div>
              {canManageRoles && assignableRoles.length > 0 && !isServerOwner && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {assignableRoles.map((role) => (
                    <button
                      key={role._id}
                      onClick={() => toggleRole(member, role._id)}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition",
                        memberRoleIds.includes(role._id)
                          ? "border-transparent text-white"
                          : "border-cream-300 text-ink-500 hover:border-lav-300"
                      )}
                      style={
                        memberRoleIds.includes(role._id)
                          ? { background: role.color || "#8f7ab8" }
                          : undefined
                      }
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
        {filtered.length === 0 && <p className="py-4 text-center text-xs text-ink-300">No members match.</p>}
      </ul>
      {isOwner && <p className="text-[11px] text-ink-300">Tip: transfer ownership from the Overview tab.</p>}
    </div>
  );
};

// ---------- Shell ----------

export const ServerSettingsModal = ({
  open,
  onClose,
  server,
  roles,
  members,
  myPermissions,
  isOwner,
  onChanged,
}) => {
  const visibleTabs = TABS.filter((t) => !t.perm || hasPermission(myPermissions, t.perm));
  const [tab, setTab] = useState("overview");
  const active = visibleTabs.find((t) => t.id === tab) ? tab : visibleTabs[0]?.id;

  if (!server) return null;

  return (
    <Modal open={open} onClose={onClose} title={`${server.name} — settings`} size="lg">
      <div className="mb-5 flex gap-1 rounded-xl bg-cream-100 p-1">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
              active === t.id ? "bg-white text-lav-700 shadow-sm" : "text-ink-500 hover:text-ink-900"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === "overview" && (
        <OverviewTab server={server} isOwner={isOwner} members={members} onChanged={onChanged} onClose={onClose} />
      )}
      {active === "roles" && <RolesTab server={server} roles={roles} onChanged={onChanged} />}
      {active === "members" && (
        <MembersTab
          server={server}
          roles={roles}
          members={members}
          myPermissions={myPermissions}
          isOwner={isOwner}
          onChanged={onChanged}
        />
      )}
    </Modal>
  );
};
