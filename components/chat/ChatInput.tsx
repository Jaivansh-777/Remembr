"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, Send, Sparkles, X } from "lucide-react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { toast } from "sonner";

import { storage } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/lib/chat";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface ChatInputProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  onMagic: () => void;
  disabled?: boolean;
  userId?: string | null;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function ChatInput({
  onSend,
  onMagic,
  disabled,
  userId,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend =
    (value.trim().length > 0 || files.length > 0) && !disabled && !uploading;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    const valid = selected.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" exceeds the 10 MB limit`);
        return false;
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" type is not supported`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...valid].slice(0, 5));
    event.target.value = "";
  };

  const uploadFiles = async (): Promise<Attachment[]> => {
    if (files.length === 0 || !userId) return [];
    setUploading(true);
    try {
      const attachments = await Promise.all(
        files.map(async (file) => {
          const path = `users/${userId}/files/${sanitizeFileName(file.name)}_${Date.now()}`;
          const fileRef = ref(storage, path);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          return {
            name: file.name,
            url,
            type: file.type,
            size: file.size,
          };
        })
      );
      return attachments;
    } catch (error) {
      console.error("[chat-input] upload failed:", error);
      toast.error("File upload failed. Please try again.");
      return [];
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    const text = value.trim();
    if ((!text && files.length === 0) || disabled) return;
    const attachments = await uploadFiles();
    if (text || attachments.length > 0) {
      onSend(text, attachments);
      setValue("");
      setFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {files.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/90 backdrop-blur-xl"
            >
              <span className="max-w-40 truncate">{file.name}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() =>
                  setFiles((prev) => prev.filter((_, i) => i !== index))
                }
                className="cursor-pointer text-white/60 hover:text-white"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-1 rounded-full border border-white/10 bg-[#1A1A1A]/70 py-1.5 pr-1.5 pl-1.5 backdrop-blur-xl transition-colors focus-within:border-white/30 sm:gap-1.5 sm:pl-2">
        <button
          type="button"
          aria-label="Attach file"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#A1A1A1] transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
        >
          <Paperclip className="size-4.5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={handleFileSelect}
        />

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Message Remembr…"
          className="min-h-10 max-h-40 flex-1 resize-none bg-transparent py-2.5 text-sm leading-relaxed text-white placeholder:text-[#A1A1A1] focus:outline-none"
        />

        <button
          type="button"
          aria-label="AI magic"
          onClick={onMagic}
          disabled={disabled || uploading}
          className={cn(
            "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#A1A1A1] transition-colors hover:bg-white/5 hover:text-white",
            "disabled:pointer-events-none disabled:opacity-40"
          )}
        >
          <Sparkles className="size-4.5" />
        </button>

        <button
          type="button"
          aria-label="Send message"
          onClick={() => void handleSend()}
          disabled={!canSend}
          className={cn(
            "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all",
            canSend
              ? "bg-white text-[#0A0A0A] shadow-[0_0_18px_rgba(255,255,255,0.35)] hover:bg-white/90"
              : "bg-white/10 text-[#A1A1A1] disabled:pointer-events-none"
          )}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </button>
      </div>
      <p className="hidden text-center text-[10px] text-[#6B6B6B] sm:block">
        Remembr can make mistakes. Enter to send · Shift+Enter for a new line
      </p>
    </div>
  );
}
