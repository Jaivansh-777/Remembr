import { GoogleGenerativeAI } from "@google/generative-ai";

import { getAdminDb } from "@/lib/firebase/admin";
import {
  countFreeMemories,
  FREE_TRIAL_MEMORIES,
  getUserTier,
} from "@/lib/trial-protection/server";

const EMBED_MODEL = "text-embedding-004";

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
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Deterministic local embedding fallback (bag-of-hashes). */
export function hashEmbedding(text: string, dimensions = 64): number[] {
  const vector = new Array(dimensions).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
  for (const word of words) {
    if (!word) continue;
    let hash = 2166136261;
    for (let i = 0; i < word.length; i++) {
      hash ^= word.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const idx = Math.abs(hash) % dimensions;
    vector[idx] += 1;
  }
  const norm = Math.sqrt(vector.reduce((acc, v) => acc + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: EMBED_MODEL });
      const result = await model.embedContent(text);
      const values = result.embedding.values;
      if (values && values.length > 0) return values;
    } catch (error) {
      console.error("[vector] Gemini embedding failed, using fallback:", error);
    }
  }
  return hashEmbedding(text);
}

export interface StoredMemoryVector {
  id: string;
  userId: string;
  userName?: string;
  content: string;
  type: string;
  chatId?: string;
  timestamp: number;
  embedding: number[];
}

export interface VectorQueryResult {
  id: string;
  content: string;
  type: string;
  chatId?: string;
  timestamp: number;
  score: number;
}

/**
 * Vector store backed by Firestore (via firebase-admin). Falls back to an
 * in-memory store when no service account is configured (per-instance only).
 */
export class MemoryVectorStore {
  private memory: Map<string, StoredMemoryVector> = new Map();

  /**
   * Stores a memory embedding. Free-tier users are capped at
   * `FREE_TRIAL_MEMORIES` cross-session (personal) memories. Returns `false`
   * when the store was skipped due to the free-tier limit.
   */
  async add(memory: Omit<StoredMemoryVector, "embedding">): Promise<boolean> {
    const embedding = await embedText(memory.content);
    const db = getAdminDb();
    if (db) {
      const tier = await getUserTier(db, memory.userId);
      if (tier === "free") {
        const count = await countFreeMemories(db, memory.userId);
        if (count >= FREE_TRIAL_MEMORIES) return false;
      }
      await db
        .collection("memories")
        .doc(memory.userId)
        .collection("items")
        .doc(memory.id)
        .set({
          ...memory,
          embedding,
        });
      return true;
    } else {
      this.memory.set(memory.id, {
        id: memory.id,
        userId: memory.userId,
        content: memory.content,
        type: memory.type,
        chatId: memory.chatId,
        timestamp: memory.timestamp,
        embedding,
      });
      return true;
    }
  }

  async query(
    userId: string,
    text: string,
    k = 5
  ): Promise<VectorQueryResult[]> {
    const embedding = await embedText(text);
    const db = getAdminDb();
    if (db) {
      const snapshot = await db
        .collection("memories")
        .doc(userId)
        .collection("items")
        .limit(200)
        .get();
      const results = snapshot.docs
        .map((d) => {
          const data = d.data() as Partial<StoredMemoryVector>;
          return {
            id: d.id,
            content: data.content ?? "",
            type: data.type ?? "fact",
            chatId: data.chatId,
            timestamp: data.timestamp ?? 0,
            score: data.embedding
              ? cosineSimilarity(data.embedding, embedding)
              : 0,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
      return results;
    }

    const all = Array.from(this.memory.values()).filter(
      (entry) => entry.userId === userId
    );
    return all
      .map((entry) => ({
        id: entry.id,
        content: entry.content,
        type: entry.type,
        chatId: entry.chatId,
        timestamp: entry.timestamp,
        score: cosineSimilarity(entry.embedding, embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}

export const vectorStore = new MemoryVectorStore();
