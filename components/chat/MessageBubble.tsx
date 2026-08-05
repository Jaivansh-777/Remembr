"use client";

import { FileText, Sparkles } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import type { Attachment, ChatMessage } from "@/lib/chat";
import { cn } from "@/lib/utils";

function isImage(attachment: Attachment) {
  return attachment.type.startsWith("image/");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(timestamp: number): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  if (isImage(attachment)) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-h-48 rounded-xl border border-white/10 object-cover transition-opacity hover:opacity-90"
        />
      </a>
    );
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-[#A1A1A1] backdrop-blur-xl transition-colors hover:border-[#7C3AED]/50 hover:text-white"
    >
      <FileText className="size-4 shrink-0 text-[#C4B5FD]" />
      <span className="truncate">{attachment.name}</span>
      <span className="ml-auto shrink-0">{formatBytes(attachment.size)}</span>
    </a>
  );
}

function RemembrAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#7C3AED]/90 shadow-[0_0_14px_rgba(124,58,237,0.35)]",
        className
      )}
    >
      <Sparkles className="size-4 text-white" />
    </span>
  );
}

function UserAvatarBubble({ className }: { className?: string }) {
  const { user } = useAuth();
  return (
    <Avatar className={cn("ring-2 ring-white/10", className)}>
      <AvatarImage
        src={user?.photoURL ?? undefined}
        alt={user?.displayName ?? "User"}
      />
      <AvatarFallback>
        {(user?.displayName ?? user?.email ?? "U").slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasAttachments = (message.attachments?.length ?? 0) > 0;
  const time = formatTime(message.createdAt);

  if (isUser) {
    return (
      <div className="animate-message-in flex items-end justify-end gap-2">
        <div className="flex max-w-[90%] flex-col items-end sm:max-w-[80%]">
          <div className="rounded-2xl rounded-br-md border border-white/10 bg-[#7C3AED] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-white shadow-[0_4px_20px_rgba(124,58,237,0.25)]">
            {hasAttachments ? (
              <div className="mb-2 flex flex-col gap-1.5">
                {message.attachments?.map((attachment, index) => (
                  <AttachmentPreview key={index} attachment={attachment} />
                ))}
              </div>
            ) : null}
            {message.content}
          </div>
          {time ? (
            <span className="mt-1 px-1 text-[10px] text-[#6B6B6B]">{time}</span>
          ) : null}
        </div>
        <UserAvatarBubble className="size-7 sm:size-8" />
      </div>
    );
  }

  return (
    <div className="animate-message-in flex items-end gap-2">
      <RemembrAvatar className="size-7 sm:size-8" />
      <div className="flex max-w-[90%] flex-col sm:max-w-[80%]">
        <div className="rounded-2xl rounded-bl-md border border-white/10 bg-[#1A1A1A]/70 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-white shadow-[0_4px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          {hasAttachments ? (
            <div className="mb-2 flex flex-col gap-1.5">
              {message.attachments?.map((attachment, index) => (
                <AttachmentPreview key={index} attachment={attachment} />
              ))}
            </div>
          ) : null}
          {message.content}
        </div>
        {time ? (
          <span className="mt-1 px-1 text-[10px] text-[#6B6B6B]">{time}</span>
        ) : null}
      </div>
    </div>
  );
}

export function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="animate-message-in flex items-end gap-2">
      <RemembrAvatar className="size-7 sm:size-8" />
      <div className="flex max-w-[90%] flex-col sm:max-w-[80%]">
        <div className="rounded-2xl rounded-bl-md border border-white/10 bg-[#1A1A1A]/70 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-white shadow-[0_4px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          {content}
          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[#7C3AED] align-middle" />
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}
