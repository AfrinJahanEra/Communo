import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input, TextArea } from "../ui/Input";
import { Avatar } from "../ui/Avatar";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { apiMessage } from "../../lib/api";
import * as userService from "../../services/userService";

/** Profile (display name, bio, avatar) + password management. */
export const UserSettingsModal = ({ open, onClose }) => {
  const { user, setUser, logout } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef(null);

  const [profile, setProfile] = useState({ displayName: "", bio: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hydratedFor, setHydratedFor] = useState(null);

  // Re-seed the form each time the modal opens for the current user.
  if (open && user && hydratedFor !== user._id + user.updatedAt) {
    setProfile({ displayName: user.displayName || "", bio: user.bio || "" });
    setHydratedFor(user._id + user.updatedAt);
  }

  if (!user) return null;

  const saveProfile = async (e) => {
    e.preventDefault();
    if (profile.displayName.trim().length > 50) {
      toast({ type: "error", title: "Display name is limited to 50 characters" });
      return;
    }
    if (profile.bio.length > 200) {
      toast({ type: "error", title: "Bio is limited to 200 characters" });
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await userService.updateProfile({
        displayName: profile.displayName.trim(),
        bio: profile.bio,
      });
      setUser(updated);
      toast({ type: "success", title: "Profile updated" });
    } catch (err) {
      toast({ type: "error", title: "Could not save profile", body: apiMessage(err) });
    } finally {
      setSavingProfile(false);
    }
  };

  const onAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ type: "error", title: "Avatar must be under 5 MB" });
      return;
    }
    setUploading(true);
    try {
      const updated = await userService.uploadAvatar(file);
      setUser(updated);
      toast({ type: "success", title: "Avatar updated" });
    } catch (err) {
      toast({ type: "error", title: "Avatar upload failed", body: apiMessage(err) });
    } finally {
      setUploading(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword.length < 8 || !/[a-zA-Z]/.test(passwords.newPassword) || !/[0-9]/.test(passwords.newPassword)) {
      toast({ type: "error", title: "New password needs 8+ chars with a letter and a number" });
      return;
    }
    setSavingPassword(true);
    try {
      await userService.changePassword(passwords);
      toast({
        type: "success",
        title: "Password changed",
        body: "All sessions were signed out. Please log in again.",
      });
      await logout();
    } catch (err) {
      toast({ type: "error", title: "Could not change password", body: apiMessage(err) });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="User settings" size="lg">
      <div className="space-y-8">
        {/* Identity */}
        <section className="flex items-center gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="group relative rounded-full"
            title="Change avatar"
            disabled={uploading}
          >
            <Avatar user={user} size="xl" />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink-900/50 text-white opacity-0 transition group-hover:opacity-100">
              <Camera size={22} />
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onAvatarPick} />
          <div>
            <p className="text-lg font-bold text-ink-900">{user.displayName || user.username}</p>
            <p className="text-sm text-ink-500">@{user.username}</p>
            <p className="text-xs text-ink-300">{user.email}</p>
          </div>
        </section>

        {/* Profile */}
        <form onSubmit={saveProfile} className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-lav-600">Profile</h3>
          <Field label="Display name" hint="Up to 50 characters">
            <Input
              value={profile.displayName}
              onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
              placeholder={user.username}
              maxLength={50}
            />
          </Field>
          <Field label="Bio" hint={`${profile.bio.length}/200`}>
            <TextArea
              value={profile.bio}
              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Tell your classmates about yourself…"
              maxLength={200}
            />
          </Field>
          <Button type="submit" loading={savingProfile}>
            Save profile
          </Button>
        </form>

        {/* Password */}
        <form onSubmit={savePassword} className="space-y-4 border-t border-cream-300 pt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-lav-600">Change password</h3>
          <p className="text-xs text-ink-500">
            Changing your password signs you out of every device.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Current password">
              <Input
                type="password"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
              />
            </Field>
            <Field label="New password">
              <Input
                type="password"
                autoComplete="new-password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
              />
            </Field>
          </div>
          <Button
            type="submit"
            variant="outline"
            loading={savingPassword}
            disabled={!passwords.currentPassword || !passwords.newPassword}
          >
            Update password
          </Button>
        </form>
      </div>
    </Modal>
  );
};
