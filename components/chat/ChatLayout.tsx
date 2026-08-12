"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatView } from "@/components/chat/ChatView";
import { Sidebar } from "@/components/chat/Sidebar";
import { UpgradePrompt } from "@/components/upgrade/UpgradePrompt";
import { fetchMemories, streamChat, storeMemoriesApi } from "@/lib/api";
import type { Attachment, ChatDoc, ChatMessage } from "@/lib/chat";
import {
  addMemories,
  addMessage,
  archiveChat,
  createChat,
  deleteChat,
  deleteMessage,
  getMemoryContext,
  renameChat,
  restoreChat,
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
  const [quota, setQuota] = useState<Quota>(() => getQuotaServer(null));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [minimized, setMinimized] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("remembr:sidebar-minimized") === "1";
  });
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const activeChatIdRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const sendingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    const unsub = watchChats(user.uid, setChats);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = watchUser(user.uid, (data) => {
      setQuota(getQuotaServer(data as QuotaUser | null));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!activeChatId) return;
    const unsub = watchMessages(activeChatId, (items) => {
      setMessages(items);
      if (!sendingRef.current) {
        setStreaming(null);
        setThinking(false);
      }
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

  const buildHistory = useCallback((): {
    role: "user" | "assistant";
    content: string;
  }[] => {
    return messagesRef.current.map((m) => {
      if (m.role === "user" && m.attachments && m.attachments.length > 0) {
        const fileBits = m.attachments
          .filter((a) => typeof a.text === "string" && a.text)
          .map((a) => `--- ${a.name} ---\n${a.text}`);
        if (fileBits.length > 0) {
          return {
            role: m.role,
            content: `${m.content}\n\n[ATTACHED FILES]\n${fileBits.join(
              "\n\n"
            )}`,
          };
        }
      }
      return { role: m.role, content: m.content };
    });
  }, []);

  const streamAssistantReply = useCallback(
    async (
      chatId: string,
      history: { role: "user" | "assistant"; content: string }[],
      text: string,
      attachments: Attachment[]
    ): Promise<void> => {
      if (!user) return;
      setThinking(true);
      const controller = new AbortController();
      abortRef.current = controller;
      let full = "";
      try {
        let memories: { content: string; type: string }[] = [];
        try {
          const token = await user.getIdToken();
          const ctx = await fetchMemories(token, { query: text, limit: 6 });
          if (ctx.length === 0) {
            const legacy = await getMemoryContext(user.uid, text);
            memories = legacy.map((m) => ({
              content: m.content,
              type: m.type,
            }));
          } else {
            memories = ctx.map((m) => ({ content: m.content, type: m.type }));
          }
        } catch (error) {
          console.error("[chat-layout] memory context failed:", error);
        }

        const token = await user.getIdToken();
        for await (const evt of streamChat(
          {
            message: text,
            userId: user.uid,
            chatId,
            userName: user.displayName ?? "Team member",
            memoryMode: "soulmate",
            attachments,
            memories,
            history,
          },
          token,
          controller.signal
        )) {
          if (evt.event === "data") {
            full += String(evt.data.text ?? "");
            setStreaming(full);
          } else if (evt.event === "memory") {
            if (Boolean(evt.data.limitReached)) {
              setShowUpgradePrompt(true);
            }
            const stored = Boolean(evt.data.stored);
            const mems = evt.data.memories;
            if (Array.isArray(mems) && mems.length > 0 && !stored) {
              try {
                const authToken = await user.getIdToken();
                const persisted = await storeMemoriesApi(authToken, {
                  memories: mems.map((m) => ({
                    content: m.content,
                    type: m.type,
                  })),
                  chatId,
                });
                if (!persisted) {
                  const result = await addMemories(
                    user.uid,
                    mems.map((m) => ({
                      content: m.content,
                      type: m.type,
                      confidence: 1,
                      chatId,
                    })),
                    chatId
                  );
                  if (result.limitReached) {
                    setShowUpgradePrompt(true);
                  }
                }
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

        if (full.trim()) {
          await addMessage(chatId, {
            role: "assistant",
            content: full,
          });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Stream failed";
        const aborted =
          error instanceof DOMException && error.name === "AbortError";
        if (aborted) return;
        if (message.includes("429")) {
          toast.error("Daily message limit reached. Try again tomorrow.");
        } else {
          toast.error(message);
        }
      } finally {
        abortRef.current = null;
        setThinking(false);
        setStreaming(null);
        setQuota((prev) => {
          if (prev.limit === Infinity) return prev;
          const used = prev.used + 1;
          return {
            ...prev,
            used,
            remaining: Math.max(0, prev.limit - used),
          };
        });
      }
    },
    [user]
  );

  const handleSend = useCallback(
    async (text: string, attachments: Attachment[]) => {
      if (!user || sendingRef.current) return;
      sendingRef.current = true;
      try {
        const chatId = await ensureChat();
        const history = buildHistory();
        await addMessage(chatId, {
          role: "user",
          content: text,
          attachments,
        });
        if (text) await touchChatTitle(chatId, text.slice(0, 30));
        await streamAssistantReply(chatId, history, text, attachments);
      } catch (error) {
        console.error("[chat-layout] send failed:", error);
        toast.error("Couldn't start the conversation. Please try again.");
      } finally {
        sendingRef.current = false;
      }
    },
    [user, ensureChat, buildHistory, streamAssistantReply]
  );

  const handleRegenerate = useCallback(async () => {
    if (!user || sendingRef.current || !activeChatIdRef.current) return;
    const msgs = messagesRef.current;
    const reversedIndex = [...msgs].reverse().findIndex((m) => m.role === "user");
    if (reversedIndex === -1) return;
    const lastUserIndex = msgs.length - 1 - reversedIndex;
    const lastUser = msgs[lastUserIndex];
    const trailing = msgs[lastUserIndex + 1];
    if (trailing && trailing.role === "assistant") {
      await deleteMessage(activeChatIdRef.current, trailing.id).catch(() => undefined);
    }
    sendingRef.current = true;
    try {
      const history = msgs
        .slice(0, lastUserIndex)
        .map((m) => ({ role: m.role, content: m.content }));
      await streamAssistantReply(
        activeChatIdRef.current,
        history,
        lastUser.content,
        lastUser.attachments ?? []
      );
    } catch (error) {
      console.error("[chat-layout] regenerate failed:", error);
    } finally {
      sendingRef.current = false;
    }
  }, [user, streamAssistantReply]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

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

  const handleToggleMinimize = useCallback(() => {
    setMinimized((prev) => {
      const next = !prev;
      window.localStorage.setItem("remembr:sidebar-minimized", next ? "1" : "0");
      return next;
    });
  }, []);

  const handleToggleSidebar = useCallback(() => {
    if (minimized) {
      handleToggleMinimize();
    } else {
      setSidebarOpen((prev) => !prev);
    }
  }, [minimized, handleToggleMinimize]);

  const handleDeleteChat = useCallback(
    async (chat: ChatDoc) => {
      if (!window.confirm(`Delete "${chat.title}"? This cannot be undone.`)) {
        return;
      }
      try {
        await deleteChat(chat.id);
        if (activeChatIdRef.current === chat.id) {
          setActiveChatId(null);
          setMessages([]);
        }
      } catch (error) {
        console.error("[chat-layout] delete failed:", error);
        toast.error("Failed to delete chat. Please try again.");
      }
    },
    []
  );

  const handleArchiveChat = useCallback(async (chat: ChatDoc) => {
    try {
      await archiveChat(chat.id);
      if (activeChatIdRef.current === chat.id) {
        setActiveChatId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("[chat-layout] archive failed:", error);
      toast.error("Failed to archive chat. Please try again.");
    }
  }, []);

  const handleRestoreChat = useCallback(async (chat: ChatDoc) => {
    try {
      await restoreChat(chat.id);
    } catch (error) {
      console.error("[chat-layout] restore failed:", error);
      toast.error("Failed to restore chat. Please try again.");
    }
  }, []);

  const handleRename = useCallback(async (chatId: string, title: string) => {
    await renameChat(chatId, title);
  }, []);

  if (loading || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#0A0A0A] text-white">
        <div className="size-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  const canRegenerate = messages.some((m) => m.role === "user");

  return (
    <div className="relative flex h-dvh overflow-hidden bg-[#0A0A0A] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-32 left-1/4 size-[26rem] rounded-full bg-white/[0.05] blur-3xl" />
        <div className="absolute -right-32 bottom-0 size-96 rounded-full bg-white/[0.04] blur-3xl" />
      </div>

      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        open={sidebarOpen}
        minimized={minimized}
        onClose={() => setSidebarOpen(false)}
        onToggleMinimize={handleToggleMinimize}
        onSelect={handleSelectChat}
        onNewChat={() => void handleNewChat()}
        onDelete={(chat) => void handleDeleteChat(chat)}
        onRename={(chatId, title) => void handleRename(chatId, title)}
        onArchive={(chat) => void handleArchiveChat(chat)}
        onRestore={(chat) => void handleRestoreChat(chat)}
      />

      <div className={cn("relative flex min-w-0 flex-1 flex-col")}>
        <ChatHeader
          onNewChat={() => void handleNewChat()}
          onToggleSidebar={handleToggleSidebar}
          sidebarMinimized={minimized}
          quota={quota}
        />
        <ChatView
          messages={messages}
          streaming={streaming}
          thinking={thinking}
          userId={user.uid}
          onSend={(text, attachments) => void handleSend(text, attachments)}
          onMagic={handleMagic}
          onStop={handleStop}
          onRegenerate={() => void handleRegenerate()}
          canRegenerate={canRegenerate && !thinking && !streaming}
          onPickSuggestion={(text) => void handleSend(text, [])}
        />
      </div>

      <UpgradePrompt
        open={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
      />
    </div>
  );
}
