"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  File as FileIcon,
  Loader2,
  Paperclip,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  createFileDoc,
  deleteFileStorage,
  processFileOnServer,
  uploadFile,
} from "@/lib/files";
import { useAuth } from "@/lib/auth-context";
import { useFiles } from "@/lib/hooks/use-files";
import {
  FILE_TIERS,
  formatBytes,
  isSupportedFileName,
  type FileDoc,
} from "@/lib/file-types";
import { addMemories } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils";

type ItemStatus = "pending" | "uploading" | "processing" | "done" | "error";

interface QueueItem {
  key: string;
  file: File;
  status: ItemStatus;
  progress: number;
  error?: string;
  fileDoc?: FileDoc;
  controller?: AbortController;
}

interface FileUploadProps {
  open: boolean;
  onClose: () => void;
  projectId?: string | null;
  chatId?: string | null;
  onUploaded?: (files: FileDoc[]) => void;
}

export function FileUpload({
  open,
  onClose,
  projectId,
  chatId,
  onUploaded,
}: FileUploadProps) {
  const { user } = useAuth();
  const { tier } = useFiles(user?.uid ?? null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const onUploadedRef = useRef(onUploaded);

  useEffect(() => {
    onUploadedRef.current = onUploaded;
  }, [onUploaded]);

  const fileSizeLimit = FILE_TIERS[tier].fileSizeLimit;

  const enqueue = useCallback(
    (files: File[]) => {
      if (!user) return;
      const next = files.filter((file) => {
        if (!isSupportedFileName(file.name)) {
          toast.error(`"${file.name}" type is not supported`);
          return false;
        }
        if (file.size > fileSizeLimit) {
          toast.error(
            `"${file.name}" exceeds the ${tier} plan limit of ${formatBytes(
              fileSizeLimit
            )}`
          );
          return false;
        }
        return true;
      });
      if (next.length === 0) return;
      setItems((prev) => [
        ...prev,
        ...next.map((file) => ({
          key: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          file,
          status: "pending" as const,
          progress: 0,
        })),
      ]);
    },
    [user, fileSizeLimit, tier]
  );

  const processOne = useCallback(
    async (item: QueueItem) => {
      if (!user) return;
      const controller = new AbortController();
      setItems((prev) =>
        prev.map((it) =>
          it.key === item.key
            ? { ...it, status: "uploading", progress: 0, controller }
            : it
        )
      );

      let path: string | undefined;
      let url: string | undefined;
      try {
        const target = await uploadFile({
          userId: user.uid,
          file: item.file,
          projectId,
          onProgress: (fraction) => {
            setItems((prev) =>
              prev.map((it) =>
                it.key === item.key
                  ? { ...it, status: "uploading", progress: fraction }
                  : it
              )
            );
          },
          signal: controller.signal,
        });
        path = target.path;
        url = target.url;

        setItems((prev) =>
          prev.map((it) =>
            it.key === item.key ? { ...it, status: "processing" } : it
          )
        );

        const token = await user.getIdToken();
        const payload = await processFileOnServer(item.file, token);

        const fileDoc = await createFileDoc(user.uid, {
          projectId: projectId ?? null,
          chatId: chatId ?? null,
          name: payload.name,
          url,
          path,
          type: payload.type,
          size: payload.size,
          category: payload.category,
          status: payload.status,
          error: payload.error,
          summary: payload.summary,
          text: payload.text,
          facts: payload.facts,
          keywords: payload.keywords,
          metadata: payload.metadata,
          expiresAt: payload.expiresAt ?? null,
        });

        const memoryDoc: FileDoc = {
          id: fileDoc,
          userId: user.uid,
          projectId: projectId ?? null,
          chatId: chatId ?? null,
          name: payload.name,
          url,
          path,
          type: payload.type,
          size: payload.size,
          category: payload.category,
          status: payload.status,
          summary: payload.summary,
          text: payload.text,
          facts: payload.facts,
          keywords: payload.keywords,
          metadata: payload.metadata,
          createdAt: Date.now(),
          expiresAt: payload.expiresAt ?? null,
        };

        void storeFileMemory(user.uid, memoryDoc, projectId ?? undefined).catch(
          (error) => console.warn("[file-upload] memory store failed:", error)
        );

        setItems((prev) =>
          prev.map((it) =>
            it.key === item.key
              ? { ...it, status: "done", progress: 1, fileDoc: memoryDoc }
              : it
          )
        );
        onUploadedRef.current?.([memoryDoc]);
      } catch (error) {
        if (path) void deleteFileStorage(path).catch(() => undefined);
        const message =
          error instanceof Error && error.name === "AbortError"
            ? "Upload cancelled"
            : error instanceof Error
              ? error.message
              : "Upload failed";
        setItems((prev) =>
          prev.map((it) =>
            it.key === item.key
              ? { ...it, status: "error", error: message }
              : it
          )
        );
        if (!(error instanceof Error && error.name === "AbortError")) {
          toast.error(`"${item.file.name}" failed to upload`);
        }
      }
    },
    [user, projectId, chatId]
  );

  useEffect(() => {
    if (!open) return;
    if (processingRef.current) return;
    const pending = items.find((item) => item.status === "pending");
    if (!pending) return;
    processingRef.current = true;
    window.setTimeout(() => {
      void processOne(pending).finally(() => {
        processingRef.current = false;
      });
    }, 0);
  }, [items, open, processOne]);

  const handleCancel = (key: string) => {
    const item = items.find((it) => it.key === key);
    if (item?.status === "uploading" || item?.status === "processing") {
      item.controller?.abort();
      setItems((prev) =>
        prev.map((it) =>
          it.key === key ? { ...it, status: "error", error: "Upload cancelled" } : it
        )
      );
      return;
    }
    setItems((prev) => prev.filter((it) => it.key !== key));
  };

  const activeCount = items.filter((it) => it.status !== "done" && it.status !== "error").length;
  const doneCount = items.filter((it) => it.status === "done").length;

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    enqueue(Array.from(event.dataTransfer.files ?? []));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && activeCount === 0) onClose();
      }}
    >
      <div className="animate-modal-in flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-white/10 bg-[#141414]/95 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-white">Add files</h2>
            <p className="text-xs text-[#A1A1A1]">
              Images, PDFs, docs, spreadsheets, code, archives
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => activeCount === 0 && onClose()}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-[#A1A1A1] transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-8 text-center transition-colors",
              dragging
                ? "border-white/40 bg-white/10"
                : "border-white/15 bg-white/5 hover:border-white/30"
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/10">
              <UploadCloud className="size-5 text-white" />
            </span>
            <p className="text-sm text-white">
              Drag &amp; drop or{" "}
              <span className="font-medium underline decoration-white/30 underline-offset-2">
                browse
              </span>
            </p>
            <p className="text-[11px] text-[#A1A1A1]">
              Up to {formatBytes(fileSizeLimit)} per file on the {tier} plan
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.gif,.webp,.svg,.bmp,.heic,.pdf,.docx,.doc,.txt,.md,.rtf,.odt,.html,.htm,.csv,.xlsx,.xls,.tsv,.ods,.pptx,.ppt,.odp,.js,.mjs,.cjs,.ts,.tsx,.jsx,.py,.css,.scss,.json,.xml,.yml,.yaml,.sh,.bash,.java,.c,.cpp,.h,.cs,.go,.rs,.rb,.php,.sql,.swift,.kt,.dart,.lua,.r,.toml,.zip,.rar,.tar,.gz,.7z"
            className="hidden"
            onChange={(event) => {
              enqueue(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />

          {items.length > 0 ? (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <QueueRow key={item.key} item={item} onCancel={() => handleCancel(item.key)} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3">
          <p className="flex items-center gap-1.5 text-xs text-[#A1A1A1]">
            <Paperclip className="size-3.5" />
            {doneCount > 0
              ? `${doneCount} attached`
              : activeCount > 0
                ? "Processing…"
                : "Ready"}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={activeCount > 0}
            className="cursor-pointer rounded-full bg-white px-4 py-1.5 text-xs font-medium text-[#0A0A0A] transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/30"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function QueueRow({
  item,
  onCancel,
}: {
  item: QueueItem;
  onCancel: () => void;
}) {
  const statusIcon = (() => {
    if (item.status === "done") return <Check className="size-3.5 text-white" />;
    if (item.status === "error")
      return <AlertTriangle className="size-3.5 text-red-300" />;
    if (item.status === "uploading" || item.status === "processing")
      return <Loader2 className="size-3.5 animate-spin text-white" />;
    return <FileIcon className="size-3.5 text-[#A1A1A1]" />;
  })();

  const progress = Math.round(item.progress * 100);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          item.status === "done"
            ? "bg-white text-[#0A0A0A]"
            : item.status === "error"
              ? "bg-red-500/15 text-red-300"
              : "bg-white/10 text-white"
        )}
      >
        {statusIcon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-white">{item.file.name}</p>
        <div className="flex items-center gap-2 text-[10px] text-[#A1A1A1]">
          <span>{formatBytes(item.file.size)}</span>
          {item.status === "uploading" ? (
            <span className="tabular-nums">{progress}%</span>
          ) : null}
          {item.status === "processing" ? <span>Extracting &amp; summarizing…</span> : null}
          {item.status === "error" ? (
            <span className="truncate text-red-300">{item.error}</span>
          ) : null}
        </div>
        {item.status === "uploading" ? (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-white transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
      </div>
      {item.status === "done" || item.status === "error" ? (
        <button
          type="button"
          aria-label="Remove"
          onClick={onCancel}
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#A1A1A1] transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <button
          type="button"
          aria-label="Cancel upload"
          onClick={onCancel}
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#A1A1A1] transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

async function storeFileMemory(
  userId: string,
  file: FileDoc,
  projectId?: string
) {
  const summary = file.summary?.trim();
  const content = summary
    ? `Uploaded file "${file.name}" — ${summary}`
    : `Uploaded file "${file.name}" (${file.category})`;
  await addMemories(
    userId,
    [
      {
        type: "attachment",
        content,
        confidence: 1,
        chatId: file.id,
      },
    ],
    file.id,
    { projectId }
  );
}
