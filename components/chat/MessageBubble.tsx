"use client";

import { useState } from "react";
import { Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { FilePreview } from "@/components/files/FilePreview";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { sendFeedback } from "@/lib/api";
import type { ChatMessage } from "@/lib/chat";
import { cn } from "@/lib/utils";

function formatTime(timestamp: number): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function RemembrAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 shadow-[0_0_14px_rgba(255,255,255,0.15)] backdrop-blur-xl",
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

function AssistantFeedback({ message }: { message: ChatMessage }) {
  const { user } = useAuth();
  const [rating, setRating] = useState<0 | 1 | -1>(0);
  const [busy, setBusy] = useState(false);

  const rate = async (value: 1 | -1 | 0) => {
    if (!user || busy) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const ok = await sendFeedback(token, {
        messageId: message.id,
        value,
      });
      if (ok) {
        setRating(value);
        toast.success(
          value === 0
            ? "Feedback cleared"
            : value === 1
              ? "Thanks! I'll learn from that."
              : "Noted. I'll adjust my responses."
        );
      } else {
        toast.error("Couldn't save feedback. Please try again.");
      }
    } catch {
      toast.error("Couldn't save feedback. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const buttonClass = (active: boolean) =>
    cn(
      "flex size-6 items-center justify-center rounded-full transition-colors",
      active
        ? "bg-white/15 text-white"
        : "text-[#6B6B6B] hover:bg-white/10 hover:text-white"
    );

  return (
    <div className="mt-1 flex items-center gap-1 px-1">
      <button
        type="button"
        aria-label="Good response"
        title="Good response"
        disabled={busy}
        onClick={() => rate(rating === 1 ? 0 : 1)}
        className={buttonClass(rating === 1)}
      >
        <ThumbsUp className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label="Bad response"
        title="Bad response"
        disabled={busy}
        onClick={() => rate(rating === -1 ? 0 : -1)}
        className={buttonClass(rating === -1)}
      >
        <ThumbsDown className="size-3.5" />
      </button>
    </div>
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
          <div className="rounded-2xl rounded-br-md border border-white/10 bg-white px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-[#0A0A0A] shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
            {hasAttachments ? (
              <div className="mb-2 flex flex-col gap-1.5">
                {message.attachments?.map((attachment, index) => (
                  <FilePreview key={index} attachment={attachment} />
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
                  <FilePreview key={index} attachment={attachment} />
                ))}
              </div>
            ) : null}
            {message.content}
          </div>
          {time ? (
            <span className="mt-1 px-1 text-[10px] text-[#6B6B6B]">{time}</span>
          ) : null}
          <AssistantFeedback message={message} />
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
          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-white align-middle" />
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}
