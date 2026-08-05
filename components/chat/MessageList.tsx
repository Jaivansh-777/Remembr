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

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, streaming, thinking]);

  const hasContent =
    messages.length > 0 || Boolean(streaming) || thinking;

  if (!hasContent) {
    return (
      <div
        ref={scrollRef}
        className="flex min-h-full flex-1 flex-col overflow-y-auto"
      >
        {empty}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex min-h-full flex-1 flex-col overflow-y-auto"
    >
      <div className="flex flex-col gap-4 pt-6 pb-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {streaming ? <StreamingBubble content={streaming} /> : null}
        {thinking && !streaming ? <TypingIndicator /> : null}
      </div>
    </div>
  );
}
