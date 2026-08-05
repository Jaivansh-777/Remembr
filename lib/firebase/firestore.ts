import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { createId, type ChatDoc, type ChatMessage } from "@/lib/chat";
import {
  generateInviteCode,
  toProjectDoc,
  type ProjectDoc,
  type ProjectMember,
  type ProjectMemoryItem,
} from "@/lib/projects";

export async function createChat(
  userId: string,
  opts?: { projectId?: string; title?: string }
): Promise<ChatDoc> {
  const id = createId();
  const chatRef = doc(db, "chats", id);
  const title = opts?.title ?? "New chat";
  await setDoc(chatRef, {
    userId,
    title,
    lastMessage: "",
    messageCount: 0,
    archived: false,
    ...(opts?.projectId ? { projectId: opts.projectId } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  if (opts?.projectId) {
    await updateDoc(doc(db, "projects", opts.projectId), {
      chatIds: arrayUnion(id),
      updatedAt: serverTimestamp(),
    });
  }
  return {
    id,
    userId,
    title,
    lastMessage: "",
    messageCount: 0,
    archived: false,
    ...(opts?.projectId ? { projectId: opts.projectId } : {}),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function watchChats(
  userId: string,
  onUpdate: (chats: ChatDoc[]) => void,
  projectId?: string
): Unsubscribe {
  const q = projectId
    ? query(
        collection(db, "chats"),
        where("projectId", "==", projectId),
        where("userId", "==", userId),
        limit(200)
      )
    : query(
        collection(db, "chats"),
        where("userId", "==", userId),
        limit(200)
      );
  return onSnapshot(
    q,
    (snapshot) => {
      const chats = snapshot.docs
        .map((d) => {
          const data = d.data() as Omit<ChatDoc, "id"> & {
            archivedAt?: unknown;
          };
          return {
            id: d.id,
            ...data,
            archived: Boolean(data.archived),
            createdAt: toMillis(data.createdAt),
            updatedAt: toMillis(data.updatedAt),
            archivedAt: data.archivedAt ? toMillis(data.archivedAt) : undefined,
          };
        })
        .sort((a, b) => b.updatedAt - a.updatedAt);
      onUpdate(chats);
    },
    (error) => {
      console.error("[firestore] watchChats failed:", error);
    }
  );
}

export async function renameChat(chatId: string, title: string) {
  await updateDoc(doc(db, "chats", chatId), { title });
}

export async function archiveChat(chatId: string) {
  await updateDoc(doc(db, "chats", chatId), {
    archived: true,
    archivedAt: serverTimestamp(),
  });
}

export async function restoreChat(chatId: string) {
  await updateDoc(doc(db, "chats", chatId), {
    archived: false,
    archivedAt: deleteField(),
  });
}

export async function deleteChat(chatId: string) {
  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);
  const projectId = chatSnap.exists()
    ? (chatSnap.data().projectId as string | undefined)
    : undefined;
  const messagesRef = collection(db, "chats", chatId, "messages");
  const snapshot = await getDocs(query(messagesRef, limit(500)));
  const batch = writeBatch(db);
  snapshot.docs.forEach((m) => batch.delete(m.ref));
  batch.delete(chatRef);
  await batch.commit();
  if (projectId) {
    await updateDoc(doc(db, "projects", projectId), {
      chatIds: arrayRemove(chatId),
    });
  }
}

const messagesRef = (chatId: string) =>
  collection(db, "chats", chatId, "messages");

export function watchMessages(
  chatId: string,
  onUpdate: (messages: ChatMessage[]) => void
): Unsubscribe {
  const q = query(messagesRef(chatId), orderBy("timestamp", "asc"));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => ({
      id: d.id,
      role: d.data().role as ChatMessage["role"],
      content: d.data().content ?? "",
      createdAt: toMillis(d.data().timestamp),
      attachments: d.data().attachments ?? [],
    }));
    onUpdate(messages);
  });
}

export async function addMessage(
  chatId: string,
  message: Omit<ChatMessage, "createdAt" | "id">,
  opts?: { assistant?: boolean }
) {
  const id = createId();
  await setDoc(doc(messagesRef(chatId), id), {
    role: message.role,
    content: message.content,
    attachments: message.attachments ?? [],
    timestamp: serverTimestamp(),
  });
  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);
  const current = (chatSnap.data()?.messageCount as number) ?? 0;
  await updateDoc(chatRef, {
    updatedAt: serverTimestamp(),
    messageCount: current + 1,
    ...(opts?.assistant ? {} : { lastMessage: message.content.slice(0, 120) }),
  });
  return id;
}

export async function touchChatTitle(chatId: string, title: string) {
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);
  if (snap.exists() && (snap.data().title === "New chat" || !snap.data().title)) {
    await updateDoc(chatRef, { title });
  }
}

// --- Memories ---

const memoriesCol = (userId: string) =>
  collection(db, "memories", userId, "items");

export interface MemoryItem {
  id: string;
  userId: string;
  content: string;
  type: "fact" | "preference" | "tone" | "project" | "attachment";
  chatId: string;
  timestamp: number;
  confidence: number;
  projectId?: string;
  shared?: boolean;
}

export function watchMemories(
  userId: string,
  onUpdate: (memories: MemoryItem[]) => void
): Unsubscribe {
  const q = query(memoriesCol(userId), orderBy("timestamp", "desc"), limit(200));
  return onSnapshot(q, (snapshot) => {
    const memories = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<MemoryItem, "id">),
      timestamp: toMillis(d.data().timestamp),
    }));
    onUpdate(memories);
  });
}

export async function addMemory(
  userId: string,
  memory: Omit<MemoryItem, "id" | "userId" | "timestamp">
) {
  const id = createId();
  await setDoc(doc(memoriesCol(userId), id), {
    userId,
    ...memory,
    timestamp: serverTimestamp(),
  });
  return id;
}

export async function addMemories(
  userId: string,
  memories: Omit<MemoryItem, "id" | "userId" | "timestamp">[],
  chatId: string,
  opts?: { projectId?: string; userName?: string }
) {
  if (memories.length === 0) return;
  if (opts?.projectId) {
    await addProjectMemories(
      opts.projectId,
      memories.map((memory) => ({
        userId,
        userName: opts.userName ?? "Team member",
        content: memory.content,
        type: mapToProjectMemoryType(memory.type),
        confidence: memory.confidence,
        chatId,
      }))
    );
    return;
  }
  const batch = writeBatch(db);
  for (const memory of memories) {
    const id = createId();
    batch.set(doc(memoriesCol(userId), id), {
      userId,
      ...memory,
      chatId,
      timestamp: serverTimestamp(),
    });
  }
  await batch.commit();
}

function mapToProjectMemoryType(
  type: MemoryItem["type"]
): ProjectMemoryItem["type"] {
  if (type === "fact" || type === "preference") return type;
  if (type === "project") return "project_update";
  return "fact";
}

export async function deleteMemory(userId: string, memoryId: string) {
  await deleteDoc(doc(memoriesCol(userId), memoryId));
}

export async function clearMemories(userId: string) {
  const snapshot = await getDocs(query(memoriesCol(userId), limit(500)));
  const batch = writeBatch(db);
  snapshot.docs.forEach((m) => batch.delete(m.ref));
  await batch.commit();
}

export async function getMemoryContext(
  userId: string,
  queryText: string,
  maxMemories = 6
): Promise<MemoryItem[]> {
  const snapshot = await getDocs(
    query(memoriesCol(userId), orderBy("timestamp", "desc"), limit(100))
  );
  const memories = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<MemoryItem, "id">),
    timestamp: toMillis(d.data().timestamp),
  }));
  return scoreMemories(memories, queryText).slice(0, maxMemories);
}

// --- Projects ---

const projectMemoriesCol = (projectId: string) =>
  collection(db, "projects", projectId, "memories");

export async function createProject(
  userId: string,
  name: string,
  description?: string
): Promise<ProjectDoc> {
  const id = createId();
  const inviteCode = generateInviteCode();
  await setDoc(doc(db, "projects", id), {
    name,
    description: description ?? "",
    ownerId: userId,
    members: [userId],
    inviteCodes: [inviteCode],
    chatIds: [],
    memoryCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", userId), {
    projects: arrayUnion(id),
  });
  return toProjectDoc(id, {
    name,
    description: description ?? "",
    ownerId: userId,
    members: [userId],
    inviteCodes: [inviteCode],
    chatIds: [],
    memoryCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export function watchProjects(
  userId: string,
  onUpdate: (projects: ProjectDoc[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "projects"),
    where("members", "array-contains", userId),
    limit(100)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const projects = snapshot.docs
        .map((d) => toProjectDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      onUpdate(projects);
    },
    (error) => {
      console.error("[firestore] watchProjects failed:", error);
    }
  );
}

export function watchProject(
  projectId: string,
  onUpdate: (project: ProjectDoc | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "projects", projectId),
    (snap) => {
      onUpdate(snap.exists() ? toProjectDoc(snap.id, snap.data()) : null);
    },
    (error) => {
      console.error("[firestore] watchProject failed:", error);
    }
  );
}

export async function getProject(projectId: string): Promise<ProjectDoc | null> {
  const snap = await getDoc(doc(db, "projects", projectId));
  return snap.exists() ? toProjectDoc(snap.id, snap.data()) : null;
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<ProjectDoc, "name" | "description">>
) {
  await updateDoc(doc(db, "projects", projectId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProject(projectId: string) {
  await deleteDoc(doc(db, "projects", projectId));
}

export async function addProjectInviteCode(projectId: string): Promise<string> {
  const code = generateInviteCode();
  await updateDoc(doc(db, "projects", projectId), {
    inviteCodes: arrayUnion(code),
    updatedAt: serverTimestamp(),
  });
  return code;
}

export async function getProjectByInviteCode(
  inviteCode: string
): Promise<ProjectDoc | null> {
  const snapshot = await getDocs(
    query(
      collection(db, "projects"),
      where("inviteCodes", "array-contains", inviteCode),
      limit(1)
    )
  );
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return toProjectDoc(docSnap.id, docSnap.data());
}

export async function joinProjectByInvite(
  projectId: string,
  userId: string
): Promise<ProjectDoc | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  if (project.members.includes(userId)) return project;
  await updateDoc(doc(db, "projects", projectId), {
    members: arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", userId), {
    projects: arrayUnion(projectId),
  });
  return { ...project, members: [...project.members, userId] };
}

export async function addProjectMember(projectId: string, userId: string) {
  await updateDoc(doc(db, "projects", projectId), {
    members: arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", userId), {
    projects: arrayUnion(projectId),
  });
}

export async function removeProjectMember(projectId: string, userId: string) {
  await updateDoc(doc(db, "projects", projectId), {
    members: arrayRemove(userId),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", userId), {
    projects: arrayRemove(projectId),
  });
}

export async function getProjectMembers(
  project: ProjectDoc
): Promise<ProjectMember[]> {
  const members = await Promise.all(
    project.members.map(async (uid) => {
      const snap = await getDoc(doc(db, "users", uid));
      const data = snap.exists() ? snap.data() : {};
      const role: ProjectMember["role"] =
        uid === project.ownerId ? "owner" : "member";
      return {
        uid,
        name: String(data.name ?? "Anonymous"),
        email: (data.email as string | null) ?? null,
        photoURL: (data.photoURL as string | null) ?? null,
        role,
      };
    })
  );
  return members;
}

// --- Project (shared) memories ---

export function watchProjectMemories(
  projectId: string,
  onUpdate: (memories: ProjectMemoryItem[]) => void
): Unsubscribe {
  const q = query(
    projectMemoriesCol(projectId),
    orderBy("timestamp", "desc"),
    limit(200)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const memories = snapshot.docs.map((d) => {
        const data = d.data() as Omit<ProjectMemoryItem, "id">;
        return {
          id: d.id,
          ...data,
          timestamp: toMillis(data.timestamp),
          shared: true,
        };
      });
      onUpdate(memories);
    },
    (error) => {
      console.error("[firestore] watchProjectMemories failed:", error);
    }
  );
}

export async function addProjectMemories(
  projectId: string,
  memories: Omit<ProjectMemoryItem, "id" | "timestamp" | "shared">[]
) {
  if (memories.length === 0) return;
  const batch = writeBatch(db);
  for (const memory of memories) {
    batch.set(doc(projectMemoriesCol(projectId), createId()), {
      ...memory,
      shared: true,
      timestamp: serverTimestamp(),
    });
  }
  await batch.commit();
  await updateDoc(doc(db, "projects", projectId), {
    memoryCount: increment(memories.length),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProjectMemory(projectId: string, memoryId: string) {
  await deleteDoc(doc(projectMemoriesCol(projectId), memoryId));
  await updateDoc(doc(db, "projects", projectId), {
    memoryCount: increment(-1),
  });
}

/**
 * Team-aware recall: project shared memories are prioritized, then the user's
 * personal memories. Used when chatting inside a project context.
 */
export async function getTeamMemoryContext(
  userId: string,
  projectId: string,
  queryText: string,
  maxMemories = 6
): Promise<MemoryItem[]> {
  const [projectSnap, personalSnap] = await Promise.all([
    getDocs(query(projectMemoriesCol(projectId), limit(100))),
    getDocs(
      query(memoriesCol(userId), orderBy("timestamp", "desc"), limit(100))
    ),
  ]);

  const projectMemories: MemoryItem[] = projectSnap.docs.map((d) => {
    const data = d.data() as Omit<ProjectMemoryItem, "id">;
    return {
      id: d.id,
      userId: data.userId,
      content: data.content,
      type: normalizeMemoryType(data.type),
      chatId: data.chatId ?? "",
      timestamp: toMillis(data.timestamp),
      confidence: data.confidence,
      projectId,
      shared: true,
    };
  });

  const personalMemories = personalSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<MemoryItem, "id">),
    timestamp: toMillis(d.data().timestamp),
  }));

  const combined = [
    ...projectMemories.map((memory) => ({ memory, priority: 1 })),
    ...personalMemories.map((memory) => ({ memory, priority: 0 })),
  ];
  const queryTokens = tokenize(queryText);
  return combined
    .map(({ memory, priority }) => {
      const memTokens = tokenize(memory.content);
      let overlap = 0;
      queryTokens.forEach((t) => {
        if (memTokens.has(t)) overlap += 1;
      });
      const recency = Math.min(1, memory.timestamp / (Date.now() || 1));
      const relevance =
        queryTokens.size === 0 ? 0 : overlap / queryTokens.size;
      const score =
        relevance * 0.7 + recency * 0.3 + (priority === 1 ? 0.15 : 0);
      return { memory, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxMemories)
    .map((r) => r.memory);
}

function normalizeMemoryType(
  type: string | null | undefined
): MemoryItem["type"] {
  const value = String(type ?? "").toLowerCase();
  if (value === "decision" || value === "project_update") return "project";
  if (
    ["fact", "preference", "tone", "project", "attachment"].includes(value)
  ) {
    return value as MemoryItem["type"];
  }
  return "fact";
}

// --- User ---

export async function getUserDoc(userId: string) {
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
}

export function watchUser(
  userId: string,
  onUpdate: (data: Record<string, unknown> | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, "users", userId), (snap) => {
    onUpdate(snap.exists() ? snap.data() : null);
  });
}

export async function setMemoryMode(userId: string, mode: string) {
  await setDoc(
    doc(db, "users", userId),
    { memoryMode: mode, lastLogin: serverTimestamp() },
    { merge: true }
  );
}

function toMillis(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === "number") return value;
  return 0;
}

// --- Lightweight relevance scoring (client-side vector-ish retrieval) ---

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function scoreMemories<T extends { content: string; timestamp: number }>(
  memories: T[],
  queryText: string
): T[] {
  const queryTokens = tokenize(queryText);
  return [...memories]
    .map((m) => {
      const memTokens = tokenize(m.content);
      let overlap = 0;
      queryTokens.forEach((t) => {
        if (memTokens.has(t)) overlap += 1;
      });
      const recency = Math.min(1, m.timestamp / (Date.now() || 1));
      const relevance = queryTokens.size === 0 ? 0 : overlap / queryTokens.size;
      return { memory: m, score: relevance * 0.7 + recency * 0.3 };
    })
    .sort((a, b) => b.score - a.score)
    .map((r) => r.memory);
}
