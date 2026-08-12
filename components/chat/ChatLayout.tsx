"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatView } from "@/components/chat/ChatView";
import { Sidebar } from "@/components/chat/Sidebar";
import { CreateProject } from "@/components/projects/CreateProject";
import { InviteMembers } from "@/components/projects/InviteMembers";
import { UpgradePrompt } from "@/components/upgrade/UpgradePrompt";
import { fetchMemories, streamChat, storeMemoriesApi } from "@/lib/api";
import type { Attachment, ChatDoc, ChatMessage, MemoryMode } from "@/lib/chat";
import {
  addMemories,
  addMessage,
  archiveChat,
  createChat,
  deleteChat,
  getMemoryContext,
  getTeamMemoryContext,
  renameChat,
  restoreChat,
  setMemoryMode,
  touchChatTitle,
  watchChats,
  watchMessages,
  watchProject,
  watchProjects,
  watchUser,
} from "@/lib/firebase/firestore";
import type { ProjectDoc } from "@/lib/projects";
import {
  getQuota as getQuotaServer,
  type Quota,
  type QuotaUser,
} from "@/lib/rate-limit";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface ChatLayoutProps {
  projectId?: string;
}

export function ChatLayout({ projectId }: ChatLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<ChatDoc[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [mode, setMode] = useState<MemoryMode>("buddy");
  const [quota, setQuota] = useState<Quota>(() => getQuotaServer(null));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [minimized, setMinimized] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("remembr:sidebar-minimized") === "1";
  });
  const [projects, setProjects] = useState<ProjectDoc[]>([]);
  const [project, setProject] = useState<ProjectDoc | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [invitingMembers, setInvitingMembers] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const activeChatIdRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const modeRef = useRef<MemoryMode>("buddy");
  const sendingRef = useRef(false);
  const projectRef = useRef<ProjectDoc | null>(null);

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
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    if (!user) return;
    const unsub = watchProjects(user.uid, setProjects);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (!projectId) return;
    const unsub = watchProject(projectId, (doc) => {
      if (!doc) {
        router.replace("/chat");
        return;
      }
      if (!doc.members.includes(user.uid) && doc.ownerId !== user.uid) {
        router.replace("/chat");
        return;
      }
      setProject(doc);
    });
    return unsub;
  }, [user, projectId, router]);

  useEffect(() => {
    if (!user) return;
    const unsub = watchChats(user.uid, setChats, projectId);
    return unsub;
  }, [user, projectId]);

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
    const opts =
      projectId && projectRef.current
        ? {
            projectId,
            title: `Project ${projectRef.current.name} — Chat ${new Date().toLocaleDateString()}`,
          }
        : undefined;
    const chat = await createChat(user.uid, opts);
    setActiveChatId(chat.id);
    setSidebarOpen(false);
    return chat.id;
  }, [user, projectId]);

  const handleSend = useCallback(
    async (text: string, attachments: Attachment[]) => {
      if (!user || sendingRef.current) return;
      sendingRef.current = true;
      setThinking(true);
      try {
        const chatId = await ensureChat();
        const history = messagesRef.current.map((m) => {
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

        await addMessage(chatId, {
          role: "user",
          content: text,
          attachments,
        });
        if (text) await touchChatTitle(chatId, text.slice(0, 30));

        let memories: { content: string; type: string }[] = [];
        try {
          const currentProject = projectRef.current;
          const token = await user.getIdToken();
          if (!currentProject) {
            const ctx = await fetchMemories(token, { query: text, limit: 6 });
            if (ctx.length === 0) {
              const legacy = await getMemoryContext(user.uid, text);
              memories = legacy.map((m) => ({ content: m.content, type: m.type }));
            } else {
              memories = ctx.map((m) => ({ content: m.content, type: m.type }));
            }
          } else {
            const ctx = await getTeamMemoryContext(user.uid, currentProject.id, text);
            memories = ctx.map((m) => ({ content: m.content, type: m.type }));
          }
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
              projectId: projectRef.current?.id,
              projectName: projectRef.current?.name,
              userName: user.displayName ?? "Team member",
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
              if (Boolean(evt.data.limitReached)) {
                setShowUpgradePrompt(true);
              }
              const stored = Boolean(evt.data.stored);
              const mems = evt.data.memories;
              if (Array.isArray(mems) && mems.length > 0 && !stored) {
                try {
                  const token = await user.getIdToken();
                  const persisted = await storeMemoriesApi(
                    token,
                    {
                      memories: mems.map((m) => ({
                        content: m.content,
                        type: m.type,
                      })),
                      chatId,
                      projectId: projectRef.current?.id,
                    }
                  );
                  if (!persisted) {
                    const result = await addMemories(
                      user.uid,
                      mems.map((m) => ({
                        content: m.content,
                        type: m.type,
                        confidence: 1,
                        chatId,
                      })),
                      chatId,
                      {
                        projectId: projectRef.current?.id,
                        userName: user.displayName ?? "Team member",
                      }
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
      } finally {
        sendingRef.current = false;
        setThinking(false);
        setStreaming(null);
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
    const opts =
      projectId && projectRef.current
        ? {
            projectId,
            title: `Project ${projectRef.current.name} — Chat ${new Date().toLocaleDateString()}`,
          }
        : undefined;
    const chat = await createChat(user.uid, opts);
    setActiveChatId(chat.id);
    setMessages([]);
    setStreaming(null);
    setThinking(false);
    setSidebarOpen(false);
  }, [user, projectId]);

  const handleSelectChat = useCallback((id: string) => {
    setActiveChatId(id);
    setStreaming(null);
    setThinking(false);
    setSidebarOpen(false);
  }, []);

  const handleSelectProject = useCallback(
    (id: string) => {
      setSidebarOpen(false);
      router.push(`/projects/${id}`);
    },
    [router]
  );

  const handleCreatedProject = useCallback(
    (created: ProjectDoc) => {
      setCreatingProject(false);
      router.push(`/projects/${created.id}`);
    },
    [router]
  );

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
        <div className="size-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh overflow-hidden bg-[#0A0A0A] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0"
      >
        <div className="absolute -top-32 left-1/4 size-[26rem] rounded-full bg-white/[0.05] blur-3xl" />
        <div className="absolute -right-32 bottom-0 size-96 rounded-full bg-white/[0.04] blur-3xl" />
      </div>

      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        open={sidebarOpen}
        minimized={minimized}
        projects={projects}
        activeProjectId={projectId ?? null}
        onSelectProject={handleSelectProject}
        onCreateProject={() => setCreatingProject(true)}
        onHome={projectId ? () => router.push("/chat") : undefined}
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
          mode={mode}
          onModeChange={handleModeChange}
          onNewChat={() => void handleNewChat()}
          onToggleSidebar={handleToggleSidebar}
          sidebarMinimized={minimized}
          quota={quota}
          project={project}
          onOpenInvite={() => setInvitingMembers(true)}
        />
        <ChatView
          messages={activeChatId ? messages : []}
          streaming={streaming}
          thinking={thinking}
          userId={user.uid}
          projectId={projectId}
          onSend={(text, attachments) => void handleSend(text, attachments)}
          onMagic={handleMagic}
          onPickSuggestion={(text) => void handleSend(text, [])}
        />
      </div>

      <CreateProject
        open={creatingProject}
        onClose={() => setCreatingProject(false)}
        onCreated={handleCreatedProject}
      />
      {invitingMembers && project ? (
        <InviteMembers
          project={project}
          onClose={() => setInvitingMembers(false)}
        />
      ) : null}

      <UpgradePrompt
        open={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
      />
    </div>
  );
}
