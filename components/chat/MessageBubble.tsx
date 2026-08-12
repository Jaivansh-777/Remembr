"use client";

import { useState } from "react";
import { Check, Copy, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import remarkGfm from "remark-gfm";

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

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="text-white/90">{children}</em>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-white underline underline-offset-2 hover:text-white/80"
    >
      {children}
    </a>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-2 flex list-disc flex-col gap-1 pl-5 last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-2 flex list-decimal flex-col gap-1 pl-5 last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-2 mt-1 text-lg font-semibold text-white">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-2 mt-1 text-base font-semibold text-white">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-2 mt-1 text-sm font-semibold text-white">{children}</h3>
  ),
  hr: () => <hr className="my-3 border-white/10" />,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-2 border-l-2 border-white/25 pl-3 text-white/80 italic">
      {children}
    </blockquote>
  ),
  code: ({
    className,
    children,
  }: {
    className?: string;
    children?: React.ReactNode;
  }) => {
    const inline = !className;
    if (inline) {
      return (
        <code className="rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[0.82em] text-white/90">
          {children}
        </code>
      );
    }
    return (
      <code
        className={cn(
          "block overflow-x-auto py-1 font-mono text-[0.82em] leading-relaxed text-white/90",
          className
        )}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="my-2.5 overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-3.5 text-[0.82em] leading-relaxed last:mb-0">
      {children}
    </pre>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-2.5 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border border-white/15 bg-white/5 px-3 py-1.5 text-left font-medium text-white">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border border-white/10 px-3 py-1.5 text-white/85">
      {children}
    </td>
  ),
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy the response.");
    }
  };

  return (
    <button
      type="button"
      aria-label="Copy response"
      title="Copy response"
      onClick={() => void copy()}
      className={cn(
        "flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors",
        copied
          ? "text-emerald-300"
          : "text-[#6B6B6B] hover:bg-white/10 hover:text-white"
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
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
      <CopyButton text={message.content} />
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
        <div className="rounded-2xl rounded-bl-md border border-white/10 bg-[#1A1A1A]/70 px-4 py-3 text-sm text-white shadow-[0_4px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          {hasAttachments ? (
            <div className="mb-2 flex flex-col gap-1.5">
              {message.attachments?.map((attachment, index) => (
                <FilePreview key={index} attachment={attachment} />
              ))}
            </div>
          ) : null}
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        </div>
        <div className="mt-1 flex items-center gap-1 px-1">
          <span className="text-[10px] text-[#6B6B6B]">{time}</span>
        </div>
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
