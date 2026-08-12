"use client";

import { useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";

import { MessageBubble, StreamingBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import type { ChatMessage } from "@/lib/chat";

interface MessageListProps {
  messages: ChatMessage[];
  streaming?: string | null;
  thinking?: boolean;
  onRegenerate?: () => void;
  canRegenerate?: boolean;
  empty?: React.ReactNode;
}

export function MessageList({
  messages,
  streaming,
  thinking,
  onRegenerate,
  canRegenerate,
  empty,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, streaming, thinking]);

  const hasContent =
    messages.length > 0 || Boolean(streaming) || thinking;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="chat-scrollbar flex min-h-full flex-1 flex-col overflow-y-auto"
    >
      {hasContent ? (
        <div className="animate-drop-in mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 py-6 sm:px-6">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {streaming ? <StreamingBubble content={streaming} /> : null}
          {thinking && !streaming ? <TypingIndicator /> : null}
          {canRegenerate && !streaming && !thinking ? (
            <button
              type="button"
              onClick={onRegenerate}
              className="flex cursor-pointer items-center gap-1.5 self-center rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-[#A1A1A1] backdrop-blur-xl transition-all hover:border-white/25 hover:bg-white/10 hover:text-white"
            >
              <RefreshCw className="size-3.5" />
              Regenerate response
            </button>
          ) : null}
        </div>
      ) : (
        empty
      )}
    </div>
  );
}
