import { createId } from "@/lib/chat";
import { getSql } from "@/lib/db";

export interface FeedbackWrite {
  userId: string;
  chatId?: string | null;
  messageId: string;
  value: number;
}

export async function upsertFeedbackDb(
  input: FeedbackWrite
): Promise<{ previous: number } | null> {
  const db = getSql();
  if (!db) return null;
  try {
    const existing = await db<Record<string, unknown>[]>`
      SELECT value FROM message_feedback
      WHERE user_id = ${input.userId} AND message_id = ${input.messageId}`;
    const previous = existing.length > 0 ? Number(existing[0].value ?? 0) : 0;

    if (input.value === 0) {
      if (existing.length > 0) {
        await db`
          DELETE FROM message_feedback
          WHERE user_id = ${input.userId} AND message_id = ${input.messageId}`;
      }
    } else {
      await db`
        INSERT INTO message_feedback (id, user_id, chat_id, message_id, value, created_at)
        VALUES (
          ${createId()}, ${input.userId}, ${input.chatId ?? null},
          ${input.messageId}, ${input.value}, ${Date.now()}
        )
        ON CONFLICT (user_id, message_id) DO UPDATE SET
          value = ${input.value},
          chat_id = COALESCE(EXCLUDED.chat_id, message_feedback.chat_id),
          created_at = ${Date.now()}`;
    }
    return { previous };
  } catch (error) {
    console.error("[db/feedback] upsert failed:", error);
    return null;
  }
}
