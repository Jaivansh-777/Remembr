"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, Sparkles, X } from "lucide-react";

import { FileUpload } from "@/components/files/FileUpload";
import { FileIconFor } from "@/components/files/FilePreview";
import type { Attachment } from "@/lib/chat";
import type { FileDoc } from "@/lib/file-types";
import { shortFileName } from "@/lib/file-types";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  onMagic: () => void;
  disabled?: boolean;
  userId?: string | null;
  projectId?: string | null;
}

function toAttachment(file: FileDoc): Attachment {
  return {
    name: file.name,
    url: file.url,
    type: file.type,
    size: file.size,
    fileId: file.id,
    category: file.category,
    summary: file.summary,
    text: file.text,
    processed: file.status === "ready",
  };
}

export function ChatInput({
  onSend,
  onMagic,
  disabled,
  projectId,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend =
    (value.trim().length > 0 || attachments.length > 0) && !disabled;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleUploaded = (files: FileDoc[]) => {
    setAttachments((prev) => [
      ...prev,
      ...files.filter((file) => !prev.some((a) => a.fileId === file.id)).map(toAttachment),
    ]);
  };

  const handleSend = () => {
    const text = value.trim();
    if ((!text && attachments.length === 0) || disabled) return;
    onSend(text, attachments);
    setValue("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <span
              key={attachment.fileId ?? `${attachment.name}-${attachment.size}`}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 py-1 pr-1.5 pl-2.5 text-xs text-white/90 backdrop-blur-xl"
            >
              {FileIconFor(attachment.category)}
              <span className="max-w-40 truncate" title={attachment.name}>
                {shortFileName(attachment.name)}
              </span>
              <button
                type="button"
                aria-label={`Remove ${attachment.name}`}
                onClick={() =>
                  setAttachments((prev) =>
                    prev.filter((a) => a !== attachment)
                  )
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
          onClick={() => setFileModalOpen(true)}
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#A1A1A1] transition-colors hover:bg-white/5 hover:text-white"
        >
          <Paperclip className="size-4.5" />
        </button>

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
          disabled={disabled}
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
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all",
            canSend
              ? "bg-white text-[#0A0A0A] shadow-[0_0_18px_rgba(255,255,255,0.35)] hover:bg-white/90"
              : "bg-white/10 text-[#A1A1A1] disabled:pointer-events-none"
          )}
        >
          <Send className="size-4" />
        </button>
      </div>
      <p className="hidden text-center text-[10px] text-[#6B6B6B] sm:block">
        Remembr can make mistakes. Enter to send · Shift+Enter for a new line
      </p>

      <FileUpload
        open={fileModalOpen}
        onClose={() => setFileModalOpen(false)}
        projectId={projectId}
        onUploaded={handleUploaded}
      />
    </div>
  );
}
