import { getSql } from "@/lib/db";

export interface MemoryRow {
  id: string;
  userId: string;
  chatId?: string | null;
  content: string;
  type: string;
  confidence?: number;
  createdAt: number;
}

function rowToPublic(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    userId: row.user_id,
    chatId: row.chat_id ?? null,
    content: row.content,
    type: row.type,
    confidence: Number(row.confidence ?? 1),
    createdAt: Number(row.created_at ?? 0),
  };
}

export async function insertMemoriesDb(memories: MemoryRow[]): Promise<number> {
  const db = getSql();
  if (!db || memories.length === 0) return 0;
  try {
    let inserted = 0;
    for (const memory of memories) {
      const result = await db`
        INSERT INTO memories (id, user_id, chat_id, content, type, confidence, created_at)
        VALUES (
          ${memory.id}, ${memory.userId},
          ${memory.chatId ?? null}, ${memory.content}, ${memory.type},
          ${memory.confidence ?? 1}, ${memory.createdAt}
        ) ON CONFLICT (id) DO NOTHING`;
      inserted += result.count;
    }
    return inserted;
  } catch (error) {
    console.error("[db/memories] insert failed:", error);
    return 0;
  }
}

export async function recentMemoriesDb(userId: string, limit = 50) {
  const db = getSql();
  if (!db) return [];
  try {
    const rows = await db<Record<string, unknown>[]>`
      SELECT id, user_id, chat_id, content, type, confidence, created_at
      FROM memories WHERE user_id = ${userId}
      ORDER BY created_at DESC LIMIT ${limit}`;
    return rows.map(rowToPublic);
  } catch (error) {
    console.error("[db/memories] recent failed:", error);
    return [];
  }
}

/** Keyword recall: matches the query against stored memory content. */
export async function searchMemoriesDb(
  userId: string,
  query: string,
  limit = 30
) {
  const db = getSql();
  if (!db) return [];
  try {
    const pattern = `%${query}%`;
    const rows = await db<Record<string, unknown>[]>`
      SELECT id, user_id, chat_id, content, type, confidence, created_at
      FROM memories
      WHERE user_id = ${userId} AND content ILIKE ${pattern}
      ORDER BY created_at DESC LIMIT ${limit}`;
    return rows.map(rowToPublic);
  } catch (error) {
    console.error("[db/memories] search failed:", error);
    return [];
  }
}
