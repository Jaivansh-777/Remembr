import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { createId, type ChatDoc, type ChatMessage } from "@/lib/chat";

const chatsCol = (userId: string) => collection(db, "chats", userId, "items");

export async function createChat(userId: string): Promise<ChatDoc> {
  const id = createId();
  const chatRef = doc(db, "chats", id);
  await setDoc(chatRef, {
    userId,
    title: "New chat",
    lastMessage: "",
    messageCount: 0,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return {
    id,
    userId,
    title: "New chat",
    lastMessage: "",
    messageCount: 0,
    archived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function watchChats(
  userId: string,
  onUpdate: (chats: ChatDoc[]) => void
): Unsubscribe {
  const q = query(
    chatsCol(userId),
    orderBy("updatedAt", "desc"),
    limit(200)
  );
  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map((d) => {
      const data = d.data() as Omit<ChatDoc, "id"> & { archivedAt?: unknown };
      return {
        id: d.id,
        ...data,
        archived: Boolean(data.archived),
        createdAt: toMillis(data.createdAt),
        updatedAt: toMillis(data.updatedAt),
        archivedAt: data.archivedAt ? toMillis(data.archivedAt) : undefined,
      };
    });
    onUpdate(chats);
  });
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
  const messagesRef = collection(db, "chats", chatId, "messages");
  const snapshot = await getDocs(query(messagesRef, limit(500)));
  const batch = writeBatch(db);
  snapshot.docs.forEach((m) => batch.delete(m.ref));
  batch.delete(doc(db, "chats", chatId));
  await batch.commit();
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
  chatId: string
) {
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
