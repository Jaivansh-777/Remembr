"use client";

import { useEffect, useRef } from "react";

import { MessageBubble, StreamingBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import type { ChatMessage } from "@/lib/chat";

interface MessageListProps {
  messages: ChatMessage[];
  streaming?: string | null;
  thinking?: boolean;
  empty?: React.ReactNode;
}

export function MessageList({
  messages,
  streaming,
  thinking,
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
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 py-6 sm:px-6">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {streaming ? <StreamingBubble content={streaming} /> : null}
          {thinking && !streaming ? <TypingIndicator /> : null}
        </div>
      ) : (
        empty
      )}
    </div>
  );
}
