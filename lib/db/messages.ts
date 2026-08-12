import { getSql } from "@/lib/db";

export interface MessageRow {
  id: string;
  chatId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  attachments?: unknown[];
  createdAt: number;
}

export interface ChatRow {
  id: string;
  userId: string;
  projectId?: string | null;
  title?: string | null;
  createdAt: number;
  updatedAt: number;
}

function messageToPublic(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    chatId: row.chat_id,
    userId: row.user_id,
    role: row.role,
    content: row.content,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    createdAt: Number(row.created_at ?? 0),
  };
}

export async function upsertChatDb(chat: ChatRow): Promise<boolean> {
  const db = getSql();
  if (!db) return false;
  try {
    await db`
      INSERT INTO chats (id, user_id, project_id, title, created_at, updated_at)
      VALUES (
        ${chat.id}, ${chat.userId}, ${chat.projectId ?? null},
        ${chat.title ?? null}, ${chat.createdAt}, ${chat.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = COALESCE(EXCLUDED.title, chats.title),
        updated_at = GREATEST(chats.updated_at, EXCLUDED.updated_at)`;
    return true;
  } catch (error) {
    console.error("[db/messages] upsertChat failed:", error);
    return false;
  }
}

export async function insertMessageDb(message: MessageRow): Promise<boolean> {
  const db = getSql();
  if (!db) return false;
  try {
    await db`
      INSERT INTO messages (id, chat_id, user_id, role, content, attachments, created_at)
      VALUES (
        ${message.id}, ${message.chatId}, ${message.userId},
        ${message.role}, ${message.content},
        ${JSON.stringify(message.attachments ?? [])}, ${message.createdAt}
      ) ON CONFLICT (id) DO NOTHING`;
    await upsertChatDb({
      id: message.chatId,
      userId: message.userId,
      title: null,
      createdAt: message.createdAt,
      updatedAt: message.createdAt,
    });
    return true;
  } catch (error) {
    console.error("[db/messages] insert failed:", error);
    return false;
  }
}

export async function getMessagesDb(chatId: string, limit = 200) {
  const db = getSql();
  if (!db) return [];
  try {
    const rows = await db<Record<string, unknown>[]>`
      SELECT id, chat_id, user_id, role, content, attachments, created_at
      FROM messages WHERE chat_id = ${chatId}
      ORDER BY created_at ASC LIMIT ${limit}`;
    return rows.map(messageToPublic);
  } catch (error) {
    console.error("[db/messages] get failed:", error);
    return [];
  }
}
