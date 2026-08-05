"use client";

import {
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  Image as ImageIcon,
  Presentation,
} from "lucide-react";

import type { Attachment } from "@/lib/chat";
import type { FileCategory } from "@/lib/file-types";
import { formatBytes, isImageType } from "@/lib/file-types";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<FileCategory, string> = {
  image: "Image",
  document: "Document",
  spreadsheet: "Spreadsheet",
  presentation: "Presentation",
  code: "Code",
  archive: "Archive",
};

const CATEGORY_ICON: Record<FileCategory, typeof FileText> = {
  image: ImageIcon,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  code: FileCode2,
  archive: FolderArchive,
};

function categoryOf(attachment: Attachment): FileCategory {
  const value = attachment.category as FileCategory | undefined;
  if (value) return value;
  if (isImageType(attachment.type)) return "image";
  return "document";
}

export function FileIconFor(
  category: FileCategory | string | undefined,
  className?: string
) {
  const resolved: FileCategory =
    category && category in CATEGORY_ICON ? (category as FileCategory) : "document";
  const Icon = CATEGORY_ICON[resolved];
  return <Icon className={cn("size-4", className)} />;
}

/** Inline attachment card shown inside chat bubbles. */
export function FilePreview({ attachment }: { attachment: Attachment }) {
  const category = categoryOf(attachment);
  const isImage = category === "image";

  if (isImage) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block overflow-hidden rounded-xl border border-white/10 transition-colors hover:border-white/30"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-h-44 w-full object-cover"
        />
        <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 text-xs font-medium text-white">
          <ImageIcon className="size-3.5" />
          <span className="truncate">{attachment.name}</span>
        </span>
      </a>
    );
  }

  const Icon = CATEGORY_ICON[category];
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-xs text-[#A1A1A1] backdrop-blur-xl transition-colors hover:border-white/30 hover:text-white"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-white">
          {attachment.name}
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className="rounded-full border border-white/15 bg-white/10 px-1.5 py-px text-[10px] font-medium text-white/80">
            {CATEGORY_LABEL[category]}
          </span>
          <span>{formatBytes(attachment.size)}</span>
          {attachment.processed && attachment.summary ? (
            <span className="truncate text-[10px] text-[#A1A1A1]">
              {attachment.summary}
            </span>
          ) : null}
        </span>
      </span>
      <Download className="size-3.5 shrink-0 text-[#A1A1A1]" />
    </a>
  );
}
