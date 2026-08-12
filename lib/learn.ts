import { getSql } from "@/lib/db";

export type DetectedLanguage = "hindi" | "hinglish" | "english" | "other";

export interface LearningTrait {
  preferredLanguage: string;
  style: string;
  tone: string;
  signalCount: number;
}

export interface FeedbackDelta {
  up: number;
  down: number;
  score: number;
}

const HINGLISH_WORDS = new Set([
  "aap", "apna", "apne", "aur", "bhai", "dikh", "diya", "ek", "gaya", "hai",
  "hum", "ja", "ka", "kar", "kare", "ki", "kya", "kyu", "mujhe", "nahi",
  "na", "raha", "rha", "sab", "se", "tha", "the", "to", "ye", "yeh", "ho",
]);

export function detectLanguage(text: string): DetectedLanguage {
  if (!text) return "other";
  const devanagari = (text.match(/[\u0900-\u097F]/g) ?? []).length;
  if (devanagari >= 3) return "hindi";
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const hits = words.filter((word) => HINGLISH_WORDS.has(word)).length;
  if (hits >= 2) return "hinglish";
  return "english";
}

export function hasEmoji(text: string): boolean {
  return /\p{Extended_Pictographic}/u.test(text);
}

export async function learnFromMessage(
  userId: string,
  content: string
): Promise<void> {
  const db = getSql();
  if (!db || !userId || !content) return;
  const lang = detectLanguage(content);
  const hindi = lang === "hindi" || lang === "hinglish" ? 1 : 0;
  const emoji = hasEmoji(content) ? 1 : 0;
  const now = Date.now();
  try {
    await db`
      INSERT INTO user_profiles (
        user_id, message_count, avg_message_chars, hindi_messages,
        emoji_messages, up_votes, down_votes, style_score, learning, updated_at
      )
      VALUES (
        ${userId}, 1, ${content.length}, ${hindi}, ${emoji},
        0, 0, 0, '{}'::jsonb, ${now}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        message_count = user_profiles.message_count + 1,
        avg_message_chars = (
          user_profiles.avg_message_chars * user_profiles.message_count + ${content.length}
        ) / (user_profiles.message_count + 1),
        hindi_messages = user_profiles.hindi_messages + ${hindi},
        emoji_messages = user_profiles.emoji_messages + ${emoji},
        updated_at = ${now}`;
  } catch (error) {
    console.error("[learn] learnFromMessage failed:", error);
  }
}

export async function learnFromFeedback(
  userId: string,
  delta: FeedbackDelta
): Promise<void> {
  const db = getSql();
  if (!db || !userId) return;
  const now = Date.now();
  try {
    await db`
      INSERT INTO user_profiles (
        user_id, message_count, avg_message_chars, hindi_messages,
        emoji_messages, up_votes, down_votes, style_score, learning, updated_at
      )
      VALUES (
        ${userId}, 0, 0, 0, 0,
        ${delta.up}, ${delta.down}, ${delta.score}, '{}'::jsonb, ${now}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        up_votes = user_profiles.up_votes + ${delta.up},
        down_votes = user_profiles.down_votes + ${delta.down},
        style_score = LEAST(1, GREATEST(-1, user_profiles.style_score + ${delta.score})),
        updated_at = ${now}`;
  } catch (error) {
    console.error("[learn] learnFromFeedback failed:", error);
  }
}

export async function getLearningProfile(
  userId: string
): Promise<LearningTrait | null> {
  const db = getSql();
  if (!db) return null;
  try {
    const rows = await db<Record<string, unknown>[]>`
      SELECT * FROM user_profiles WHERE user_id = ${userId}`;
    if (rows.length === 0) return null;
    const row = rows[0];
    const count = Number(row.message_count ?? 0);
    const up = Number(row.up_votes ?? 0);
    const down = Number(row.down_votes ?? 0);
    const score = Number(row.style_score ?? 0);
    const hindi = Number(row.hindi_messages ?? 0);
    const emoji = Number(row.emoji_messages ?? 0);
    const avgChars = Number(row.avg_message_chars ?? 0);
    if (count === 0 && up === 0 && down === 0) return null;

    const hindiRatio = count > 0 ? hindi / count : 0;
    let preferredLanguage = "English";
    if (hindiRatio >= 0.6) preferredLanguage = "Hindi/Hinglish";
    else if (hindiRatio >= 0.25) preferredLanguage = "Hinglish";

    let style = "balanced";
    if (score > 0.25) style = "detailed";
    else if (score < -0.25) style = "concise";
    else if (avgChars >= 280) style = "moderate-to-detailed";
    else if (avgChars > 0 && avgChars <= 90) style = "concise";

    const emojiRatio = count > 0 ? emoji / count : 0;
    const tone = emojiRatio >= 0.3 ? "casual and warm" : "professional and clear";

    return {
      preferredLanguage,
      style,
      tone,
      signalCount: count + up + down,
    };
  } catch (error) {
    console.error("[learn] getLearningProfile failed:", error);
    return null;
  }
}

export async function buildLearningProfileBlock(
  userId: string
): Promise<string | null> {
  const profile = await getLearningProfile(userId);
  if (!profile) return null;

  const lines: string[] = [
    "[LEARNED PREFERENCES]",
    "The assistant learned the following about this user by observing their messages and thumbs up/down feedback. Apply it to match their style:",
    `- Preferred language: ${profile.preferredLanguage}. When the user writes in that language, respond in the same language.`,
    `- Response style: ${profile.style}. Match this level of detail.`,
    `- Tone: ${profile.tone}.`,
    `- Learning confidence: based on ${profile.signalCount} observed signal(s). If few signals, adapt naturally and don't overfit.`,
  ];
  return lines.join("\n");
}
