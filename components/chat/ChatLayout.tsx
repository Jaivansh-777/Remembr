"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatView } from "@/components/chat/ChatView";
import { Sidebar } from "@/components/chat/Sidebar";
import { streamChat } from "@/lib/api";
import type { Attachment, ChatDoc, ChatMessage, MemoryMode } from "@/lib/chat";
import {
  addMemories,
  addMessage,
  createChat,
  deleteChat,
  getMemoryContext,
  incrementMessageCount,
  renameChat,
  setMemoryMode,
  touchChatTitle,
  watchChats,
  watchMessages,
  watchUser,
} from "@/lib/firebase/firestore";
import {
  getQuota as getQuotaServer,
  type Quota,
  type QuotaUser,
} from "@/lib/rate-limit";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export function ChatLayout() {
  const { user, loading } = useAuth();
  const [chats, setChats] = useState<ChatDoc[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [mode, setMode] = useState<MemoryMode>("buddy");
  const [quota, setQuota] = useState<Quota>(() => getQuotaServer(null));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeChatIdRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const modeRef = useRef<MemoryMode>("buddy");
  const sendingRef = useRef(false);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (!user) return;
    const unsub = watchChats(user.uid, setChats);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = watchUser(user.uid, (data) => {
      const nextMode = data?.memoryMode as MemoryMode | undefined;
      if (nextMode === "goldfish" || nextMode === "buddy" || nextMode === "soulmate") {
        setMode(nextMode);
      }
      setQuota(getQuotaServer(data as QuotaUser | null));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!activeChatId) return;
    const unsub = watchMessages(activeChatId, (items) => {
      setMessages(items);
      setStreaming(null);
      setThinking(false);
    });
    return unsub;
  }, [activeChatId]);

  const ensureChat = useCallback(async (): Promise<string> => {
    if (activeChatIdRef.current) return activeChatIdRef.current;
    if (!user) throw new Error("Not authenticated");
    const chat = await createChat(user.uid);
    setActiveChatId(chat.id);
    setSidebarOpen(false);
    return chat.id;
  }, [user]);

  const handleSend = useCallback(
    async (text: string, attachments: Attachment[]) => {
      if (!user || sendingRef.current) return;
      sendingRef.current = true;
      setThinking(true);
      try {
        const chatId = await ensureChat();
        const history = messagesRef.current.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        await addMessage(chatId, {
          role: "user",
          content: text,
          attachments,
        });
        if (text) await touchChatTitle(chatId, text.slice(0, 30));

        let memories: { content: string; type: string }[] = [];
        try {
          const ctx = await getMemoryContext(user.uid, text);
          memories = ctx.map((m) => ({ content: m.content, type: m.type }));
        } catch (error) {
          console.error("[chat-layout] memory context failed:", error);
        }

        const token = await user.getIdToken();
        let full = "";
        try {
          for await (const evt of streamChat(
            {
              message: text,
              userId: user.uid,
              chatId,
              memoryMode: modeRef.current,
              attachments,
              memories,
              history,
            },
            token
          )) {
            if (evt.event === "data") {
              full += String(evt.data.text ?? "");
              setStreaming(full);
            } else if (evt.event === "memory") {
              const stored = Boolean(evt.data.stored);
              const mems = evt.data.memories;
              if (Array.isArray(mems) && mems.length > 0 && !stored) {
                try {
                  await addMemories(
                    user.uid,
                    mems.map((m) => ({
                      content: m.content,
                      type: m.type,
                      confidence: 1,
                      chatId,
                    })),
                    chatId
                  );
                } catch (error) {
                  console.error("[chat-layout] store memories failed:", error);
                }
              }
            } else if (evt.event === "error") {
              toast.error(String(evt.data.message ?? "Something went wrong"));
            } else if (evt.event === "done") {
              break;
            }
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Stream failed";
          if (message.includes("429")) {
            toast.error("Daily message limit reached. Try again tomorrow.");
          } else {
            toast.error(message);
          }
        } finally {
          setThinking(false);
          setStreaming(null);
          if (full.trim()) {
            try {
              await addMessage(chatId, {
                role: "assistant",
                content: full,
              });
            } catch (error) {
              console.error("[chat-layout] save assistant failed:", error);
            }
          }
          const used = await incrementMessageCount(user.uid);
          setQuota((prev) => ({ ...prev, used }));
        }
      } finally {
        sendingRef.current = false;
      }
    },
    [user, ensureChat]
  );

  const handleMagic = useCallback(() => {
    void handleSend(
      "Give me a fresh, creative idea related to my recent work and context.",
      []
    );
  }, [handleSend]);

  const handleNewChat = useCallback(async () => {
    if (!user) return;
    const chat = await createChat(user.uid);
    setActiveChatId(chat.id);
    setMessages([]);
    setStreaming(null);
    setThinking(false);
    setSidebarOpen(false);
  }, [user]);

  const handleSelectChat = useCallback((id: string) => {
    setActiveChatId(id);
    setStreaming(null);
    setThinking(false);
    setSidebarOpen(false);
  }, []);

  const handleDeleteChat = useCallback(
    async (chat: ChatDoc) => {
      if (!window.confirm(`Delete "${chat.title}"? This cannot be undone.`)) {
        return;
      }
      await deleteChat(chat.id);
      if (activeChatIdRef.current === chat.id) {
        setActiveChatId(null);
        setMessages([]);
      }
    },
    []
  );

  const handleRename = useCallback(async (chatId: string, title: string) => {
    await renameChat(chatId, title);
  }, []);

  const handleModeChange = useCallback(
    (nextMode: MemoryMode) => {
      setMode(nextMode);
      if (user) void setMemoryMode(user.uid, nextMode);
    },
    [user]
  );

  if (loading || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#0A0A0A] text-white">
        <div className="size-8 animate-spin rounded-full border-2 border-[#7C3AED] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#0A0A0A] text-white">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={handleSelectChat}
        onNewChat={() => void handleNewChat()}
        onDelete={(chat) => void handleDeleteChat(chat)}
        onRename={(chatId, title) => void handleRename(chatId, title)}
      />

      <div className={cn("flex min-w-0 flex-1 flex-col")}>
        <ChatHeader
          mode={mode}
          onModeChange={handleModeChange}
          onNewChat={() => void handleNewChat()}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          quota={quota}
        />
        <ChatView
          messages={activeChatId ? messages : []}
          streaming={streaming}
          thinking={thinking}
          userId={user.uid}
          onSend={(text, attachments) => void handleSend(text, attachments)}
          onMagic={handleMagic}
          onPickSuggestion={(text) => void handleSend(text, [])}
        />
      </div>
    </div>
  );
}
