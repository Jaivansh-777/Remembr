"use client";

import { FileText, Sparkles } from "lucide-react";

import type { Attachment, ChatMessage } from "@/lib/chat";

interface MessageBubbleProps {
  message: ChatMessage;
}

function isImage(attachment: Attachment) {
  return attachment.type.startsWith("image/");
}

function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  if (isImage(attachment)) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-h-48 rounded-lg border border-white/10 object-cover"
        />
      </a>
    );
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#A1A1A1] transition-colors hover:border-[#7C3AED]/50 hover:text-white"
    >
      <FileText className="size-4 shrink-0 text-[#C4B5FD]" />
      <span className="truncate">{attachment.name}</span>
      <span className="ml-auto shrink-0">
        {formatBytes(attachment.size)}
      </span>
    </a>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasAttachments = (message.attachments?.length ?? 0) > 0;

  if (isUser) {
    return (
      <div className="animate-message-in flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-white/10 bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-white shadow-[0_4px_20px_rgba(124,58,237,0.35)] sm:max-w-[75%]">
          {hasAttachments ? (
            <div className="mb-2 flex flex-col gap-1.5">
              {message.attachments?.map((attachment, index) => (
                <AttachmentPreview key={index} attachment={attachment} />
              ))}
            </div>
          ) : null}
          {message.content ? (
            <span className="flex items-start gap-1.5">
              {message.content}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-message-in flex items-end gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] shadow-[0_0_12px_rgba(124,58,237,0.4)]">
        <Sparkles className="size-3.5 text-white" />
      </span>
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-white/10 bg-[#1A1A1A] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-white sm:max-w-[75%]">
        {hasAttachments ? (
          <div className="mb-2 flex flex-col gap-1.5">
            {message.attachments?.map((attachment, index) => (
              <AttachmentPreview key={index} attachment={attachment} />
            ))}
          </div>
        ) : null}
        {message.content}
      </div>
    </div>
  );
}

export function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="animate-message-in flex items-end gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] shadow-[0_0_12px_rgba(124,58,237,0.4)]">
        <Sparkles className="size-3.5 text-white" />
      </span>
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-white/10 bg-[#1A1A1A] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-white sm:max-w-[75%]">
        {content}
        <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[#7C3AED] align-middle" />
      </div>
    </div>
  );
}
