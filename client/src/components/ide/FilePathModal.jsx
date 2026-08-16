import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Input";

/**
 * Shared create/rename dialog for workspace files and folders. Paths encode
 * folders: "src/utils/math.py". The backend validates segments + duplicates.
 */
export const FilePathModal = ({
  open,
  onClose,
  title,
  initialPath = "",
  submitLabel,
  fieldLabel = "File path",
  hint = 'Use "/" for folders, e.g. src/main.py — the extension picks the language.',
  placeholder = "src/main.py",
  onSubmit,
}) => {
  const [path, setPath] = useState(initialPath);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Re-seed the fields each time the dialog opens (render-time adjustment)
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPath(initialPath);
      setError("");
    }
  }

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = path.trim();
    if (!trimmed) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <Field label={fieldLabel} error={error} hint={hint}>
          <Input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder={placeholder}
            autoFocus
            maxLength={200}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={!path.trim()}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
