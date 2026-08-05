"use client";

import { Download, FileText, Trash2 } from "lucide-react";

import { FileIconFor } from "@/components/files/FilePreview";
import { formatBytes, type FileCategory, type FileDoc } from "@/lib/file-types";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<FileCategory, string> = {
  image: "Image",
  document: "Document",
  spreadsheet: "Spreadsheet",
  presentation: "Presentation",
  code: "Code",
  archive: "Archive",
};

function relativeTime(timestamp: number): string {
  if (!timestamp) return "";
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

interface FileListProps {
  files: FileDoc[];
  onOpen: (file: FileDoc) => void;
  onDelete: (file: FileDoc) => void;
}

export function FileList({ files, onOpen, onDelete }: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <FileText className="size-5 text-[#A1A1A1]" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-white">No files found</p>
          <p className="text-xs text-[#A1A1A1]">
            Upload files from chat to see them here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {files.map((file) => (
        <div
          key={file.id}
          onClick={() => onOpen(file)}
          className="group flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
        >
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              file.category === "image"
                ? "bg-white/10 text-white"
                : "bg-white/10 text-white"
            )}
          >
            {file.category === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={file.url}
                alt={file.name}
                className="size-10 rounded-lg object-cover"
              />
            ) : (
              FileIconFor(file.category)
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-white">{file.name}</p>
              {file.status === "error" ? (
                <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-px text-[10px] font-medium text-red-300">
                  failed
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 flex items-center gap-2 text-[11px] text-[#A1A1A1]">
              <span className="rounded-full border border-white/15 bg-white/10 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-white/80">
                {CATEGORY_LABEL[file.category]}
              </span>
              <span>{formatBytes(file.size)}</span>
              <span>{relativeTime(file.createdAt)}</span>
            </p>
            {file.summary ? (
              <p className="mt-1 truncate text-xs text-[#A1A1A1]">{file.summary}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Download ${file.name}`}
              onClick={(event) => event.stopPropagation()}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#A1A1A1] transition-colors hover:bg-white/10 hover:text-white"
            >
              <Download className="size-4" />
            </a>
            <button
              type="button"
              aria-label={`Delete ${file.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onDelete(file);
              }}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#A1A1A1] transition-colors hover:bg-red-500/15 hover:text-red-300"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
