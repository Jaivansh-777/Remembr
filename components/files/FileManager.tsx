"use client";

import { useMemo, useState } from "react";
import {
  Download,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { FileList } from "@/components/files/FileList";
import { StorageMeter } from "@/components/files/StorageMeter";
import { deleteFileDoc, deleteFileStorage } from "@/lib/files";
import { useAuth } from "@/lib/auth-context";
import { useFiles } from "@/lib/hooks/use-files";
import {
  formatBytes,
  shortFileName,
  type FileCategory,
  type FileDoc,
} from "@/lib/file-types";
import { cn, formatDateTime } from "@/lib/utils";

const FILTERS: { id: FileCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "document", label: "Docs" },
  { id: "spreadsheet", label: "Sheets" },
  { id: "presentation", label: "Decks" },
  { id: "code", label: "Code" },
  { id: "archive", label: "Archives" },
];

type SortKey = "date" | "name" | "size" | "type";

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "date", label: "Newest" },
  { id: "name", label: "Name" },
  { id: "size", label: "Size" },
  { id: "type", label: "Type" },
];

export function FileManager() {
  const { user } = useAuth();
  const { files, quota } = useFiles(user?.uid ?? null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FileCategory | "all">("all");
  const [sort, setSort] = useState<SortKey>("date");
  const [selected, setSelected] = useState<FileDoc | null>(null);
  const [reprocessing, setReprocessing] = useState(false);

  const filtered = useMemo(() => {
    let list = [...files];
    if (filter !== "all") list = list.filter((file) => file.category === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((file) => {
        const haystack = [
          file.name,
          file.summary ?? "",
          file.text ?? "",
          file.keywords?.join(" ") ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    switch (sort) {
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "size":
        list.sort((a, b) => b.size - a.size);
        break;
      case "type":
        list.sort((a, b) => a.category.localeCompare(b.category));
        break;
      default:
        list.sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }, [files, query, filter, sort]);

  const handleDelete = async (file: FileDoc) => {
    if (!window.confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await Promise.all([
        deleteFileDoc(file.id, token),
        file.path ? deleteFileStorage(file.path) : Promise.resolve(),
      ]);
      toast.success("File deleted");
      if (selected?.id === file.id) setSelected(null);
    } catch (error) {
      console.error("[file-manager] delete failed:", error);
      toast.error("Failed to delete file");
    }
  };

  const handleReprocess = async () => {
    if (!selected || !user) return;
    setReprocessing(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/files/process/${selected.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "Reprocessing failed");
      }
      toast.success("File reprocessed");
      setSelected((current) => {
        if (!current) return current;
        return { ...current, status: "ready", error: undefined };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reprocessing failed";
      toast.error(message);
    } finally {
      setReprocessing(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <StorageMeter userId={user?.uid ?? null} />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#A1A1A1]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search files by name, summary, or keywords…"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-white placeholder:text-[#A1A1A1] focus:border-white/30 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#A1A1A1]">Sort</span>
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSort(option.id)}
              className={cn(
                "cursor-pointer rounded-full px-3 py-1 text-xs transition-colors",
                sort === option.id
                  ? "bg-white text-[#0A0A0A]"
                  : "border border-white/10 bg-white/5 text-[#A1A1A1] hover:text-white"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              "cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === item.id
                ? "bg-white text-[#0A0A0A]"
                : "border border-white/10 bg-white/5 text-[#A1A1A1] hover:text-white"
            )}
          >
            {item.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-[#A1A1A1]">
          {filtered.length} file{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <FileList files={filtered} onOpen={setSelected} onDelete={(file) => void handleDelete(file)} />

      {selected ? (
        <FileDetail
          file={selected}
          reprocessing={reprocessing}
          onReprocess={() => void handleReprocess()}
          onDownload={() => window.open(selected.url, "_blank", "noopener,noreferrer")}
          onDelete={() => void handleDelete(selected)}
          onClose={() => setSelected(null)}
        />
      ) : null}

      {quota.nearLimit ? (
        <p className="text-xs text-red-300">
          You are approaching your storage limit. Delete older files or upgrade
          your plan to keep uploading.
        </p>
      ) : null}
    </div>
  );
}

function FileDetail({
  file,
  reprocessing,
  onReprocess,
  onDownload,
  onDelete,
  onClose,
}: {
  file: FileDoc;
  reprocessing: boolean;
  onReprocess: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const metadata = file.metadata ?? {};
  const metadataEntries = Object.entries(metadata).filter(
    ([, value]) => value !== undefined && value !== null && value !== ""
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="animate-modal-in flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-[#141414]/95 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white" title={file.name}>
              {shortFileName(file.name)}
            </h2>
            <p className="mt-0.5 text-xs text-[#A1A1A1]">
              {formatBytes(file.size)} ·{" "}
              <span title={formatDateTime(file.createdAt)}>
                {formatDateTime(file.createdAt)}
              </span>
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#A1A1A1] transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          {file.category === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.url}
              alt={file.name}
              className="max-h-56 w-full rounded-xl border border-white/10 object-contain"
            />
          ) : null}

          <section className="flex flex-col gap-1.5">
            <h3 className="text-[11px] font-semibold tracking-wider text-[#A1A1A1] uppercase">
              Summary
            </h3>
            <p className="text-sm leading-relaxed text-white">
              {file.summary || "No summary available for this file."}
            </p>
          </section>

          {file.facts && file.facts.length > 0 ? (
            <section className="flex flex-col gap-1.5">
              <h3 className="text-[11px] font-semibold tracking-wider text-[#A1A1A1] uppercase">
                Key facts
              </h3>
              <ul className="flex flex-col gap-1.5">
                {file.facts.map((fact, index) => (
                  <li
                    key={index}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90"
                  >
                    {fact}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {file.keywords && file.keywords.length > 0 ? (
            <section className="flex flex-col gap-1.5">
              <h3 className="text-[11px] font-semibold tracking-wider text-[#A1A1A1] uppercase">
                Keywords
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {file.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/90"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {metadataEntries.length > 0 ? (
            <section className="flex flex-col gap-1.5">
              <h3 className="text-[11px] font-semibold tracking-wider text-[#A1A1A1] uppercase">
                Details
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#A1A1A1]">
                {metadataEntries.map(([key, value]) => (
                  <span key={key}>
                    <span className="text-white/70">{key}:</span>{" "}
                    {Array.isArray(value)
                      ? value.join(", ")
                      : String(value)}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3">
          <button
            type="button"
            onClick={onDownload}
            className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-medium text-[#0A0A0A] transition-colors hover:bg-white/90"
          >
            <Download className="size-3.5" />
            Download
          </button>
          <button
            type="button"
            onClick={onReprocess}
            disabled={reprocessing}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {reprocessing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Re-analyze
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20"
          >
            <Trash2 className="size-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
