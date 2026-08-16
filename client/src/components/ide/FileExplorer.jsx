import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  FilePlus2,
  Folder,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Menu } from "../ui/Menu";
import { cn, idOf } from "../../lib/utils";

/**
 * Workspace file tree. Files are flat records whose `path` encodes folders
 * ("src/utils/math.py"); most folders are derived on the client purely from
 * those paths, but an explicitly created (possibly empty) folder comes
 * through as its own record with `type: "folder"`. Shows live colored dots
 * for collaborators editing each file.
 */

const ensureFolderNode = (root, segments) => {
  let node = root;
  for (const segment of segments) {
    if (!node.folders.has(segment)) {
      node.folders.set(segment, { folders: new Map(), files: [] });
    }
    node = node.folders.get(segment);
  }
  return node;
};

const buildTree = (files) => {
  const root = { folders: new Map(), files: [] };
  for (const file of files) {
    const segments = file.path.split("/");
    if (file.type === "folder") {
      ensureFolderNode(root, segments);
      continue;
    }
    const node = ensureFolderNode(root, segments.slice(0, -1));
    node.files.push({ ...file, name: segments[segments.length - 1] });
  }
  return root;
};

const sortedFolders = (node) => [...node.folders.entries()].sort(([a], [b]) => a.localeCompare(b));
const sortedFiles = (node) => [...node.files].sort((a, b) => a.name.localeCompare(b.name));

const FileRow = ({ file, active, editors, onOpen, onRename, onDelete, depth }) => (
  <div
    className={cn(
      "group flex items-center gap-1 rounded-lg pr-1 transition",
      active ? "bg-lav-100" : "hover:bg-cream-300/60"
    )}
    style={{ paddingLeft: depth * 14 + 6 }}
  >
    <button
      onClick={() => onOpen(file)}
      className={cn(
        "flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left text-[13px]",
        active ? "font-semibold text-lav-800" : "text-ink-700"
      )}
      title={file.path}
    >
      <FileCode2 size={14} className={cn("shrink-0", active ? "text-lav-600" : "text-ink-300")} />
      <span className="truncate">{file.name}</span>
    </button>

    {editors.length > 0 && (
      <span className="flex shrink-0 items-center -space-x-1" title={editors.map((p) => p.displayName || p.username).join(", ")}>
        {editors.slice(0, 3).map((p) => (
          <span
            key={idOf(p.userId)}
            className="h-2 w-2 rounded-full ring-2 ring-cream-100"
            style={{ background: p.color }}
          />
        ))}
      </span>
    )}

    <Menu
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="rounded p-1 text-ink-300 opacity-0 transition hover:bg-cream-300 hover:text-ink-700 focus:opacity-100 group-hover:opacity-100"
          aria-label={`Actions for ${file.name}`}
        >
          <MoreHorizontal size={13} />
        </button>
      )}
      items={[
        { label: "Rename", icon: Pencil, onClick: () => onRename(file) },
        { label: "Delete", icon: Trash2, danger: true, onClick: () => onDelete(file) },
      ]}
    />
  </div>
);

const FolderNode = ({ name, path, node, depth, renderProps }) => {
  const [open, setOpen] = useState(true);
  const Icon = open ? FolderOpen : Folder;
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <div>
      <div
        className="group flex items-center gap-1 rounded-lg pr-1 transition hover:bg-cream-300/60"
        style={{ paddingLeft: depth * 14 + 6 }}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left text-[13px] font-medium text-ink-500"
        >
          <Chevron size={13} className="shrink-0 text-ink-300" />
          <Icon size={14} className="shrink-0 text-lav-500" />
          <span className="truncate">{name}</span>
        </button>

        <Menu
          trigger={({ toggle }) => (
            <button
              onClick={toggle}
              className="rounded p-1 text-ink-300 opacity-0 transition hover:bg-cream-300 hover:text-ink-700 focus:opacity-100 group-hover:opacity-100"
              aria-label={`Actions for ${name}`}
            >
              <MoreHorizontal size={13} />
            </button>
          )}
          items={[
            { label: "Rename", icon: Pencil, onClick: () => renderProps.onRenameFolder(path) },
            { label: "Delete", icon: Trash2, danger: true, onClick: () => renderProps.onDeleteFolder(path) },
          ]}
        />
      </div>
      {open && <TreeLevel node={node} path={path} depth={depth + 1} renderProps={renderProps} />}
    </div>
  );
};

const TreeLevel = ({ node, path, depth, renderProps }) => (
  <div>
    {sortedFolders(node).map(([name, child]) => (
      <FolderNode
        key={name}
        name={name}
        path={path ? `${path}/${name}` : name}
        node={child}
        depth={depth}
        renderProps={renderProps}
      />
    ))}
    {sortedFiles(node).map((file) => (
      <FileRow
        key={idOf(file._id)}
        file={file}
        depth={depth}
        active={idOf(file._id) === renderProps.activeFileId}
        editors={renderProps.editorsByFile.get(idOf(file._id)) || []}
        onOpen={renderProps.onOpen}
        onRename={renderProps.onRename}
        onDelete={renderProps.onDelete}
      />
    ))}
  </div>
);

export const FileExplorer = ({
  files,
  participants,
  activeFileId,
  onOpen,
  onCreate,
  onRename,
  onDelete,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}) => {
  const tree = useMemo(() => buildTree(files), [files]);

  const editorsByFile = useMemo(() => {
    const map = new Map();
    for (const p of participants) {
      if (!p.activeFileId) continue;
      const key = idOf(p.activeFileId);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    return map;
  }, [participants]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-300">Files</p>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onCreateFolder}
            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-lav-100 hover:text-lav-700"
            title="New folder"
          >
            <FolderPlus size={15} />
          </button>
          <button
            onClick={onCreate}
            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-lav-100 hover:text-lav-700"
            title="New file"
          >
            <FilePlus2 size={15} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {files.length === 0 ? (
          <div className="px-2 py-6 text-center">
            <p className="text-xs text-ink-500">No files yet.</p>
            <button onClick={onCreate} className="mt-1 text-xs font-semibold text-lav-600 hover:underline">
              Create the first file
            </button>
          </div>
        ) : (
          <TreeLevel
            node={tree}
            path=""
            depth={0}
            renderProps={{
              activeFileId,
              editorsByFile,
              onOpen,
              onRename,
              onDelete,
              onRenameFolder,
              onDeleteFolder,
            }}
          />
        )}
      </div>
    </div>
  );
};
