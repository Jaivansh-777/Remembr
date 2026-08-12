import { getSql } from "@/lib/db";
import type {
  FileCategory,
  FileMetadata,
  FileStatus,
} from "@/lib/file-types";

/** Raw row shape stored in the `files` table. */
export interface FileRow {
  id: string;
  userId: string;
  projectId: string | null;
  chatId: string | null;
  name: string;
  type: string | null;
  category: FileCategory;
  size: number;
  status: FileStatus;
  summary: string | null;
  text: string | null;
  facts: string[];
  keywords: string[];
  metadata: FileMetadata;
  content: Buffer | null;
  error: string | null;
  createdAt: number;
  expiresAt: number | null;
}

export interface NewFileRow {
  id: string;
  userId: string;
  projectId?: string | null;
  chatId?: string | null;
  name: string;
  type: string | null;
  category: FileCategory;
  size: number;
  status: FileStatus;
  summary?: string | null;
  text?: string | null;
  facts?: string[];
  keywords?: string[];
  metadata?: FileMetadata;
  content?: Buffer | null;
  error?: string | null;
  createdAt: number;
  expiresAt?: number | null;
}

/** Column list shared by all read queries (excludes heavy content bytes). */
const LIST_COLUMNS = `
  id, user_id, project_id, chat_id, name, type, category, size, status,
  summary, text, facts, keywords, metadata, error, created_at, expires_at
`;

function rowToPublic(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id ?? null,
    chatId: row.chat_id ?? null,
    name: row.name,
    type: row.type,
    category: row.category,
    size: Number(row.size ?? 0),
    status: row.status,
    summary: row.summary ?? undefined,
    text: row.text ?? undefined,
    facts: Array.isArray(row.facts) ? row.facts : [],
    keywords: Array.isArray(row.keywords) ? row.keywords : [],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    error: row.error ?? undefined,
    createdAt: Number(row.created_at ?? 0),
    expiresAt: row.expires_at ?? null,
    url: row.url,
    path: "",
  };
}

export async function insertFileDb(row: NewFileRow): Promise<boolean> {
  const db = getSql();
  if (!db) return false;
  try {
    await db`
      INSERT INTO files (id, user_id, project_id, chat_id, name, type, category, size, status,
        summary, text, facts, keywords, metadata, content, error, created_at, expires_at)
      VALUES (
        ${row.id}, ${row.userId}, ${row.projectId ?? null}, ${row.chatId ?? null},
        ${row.name}, ${row.type ?? null}, ${row.category}, ${row.size}, ${row.status},
        ${row.summary ?? null}, ${row.text ?? null},
        ${JSON.stringify(row.facts ?? [])}, ${JSON.stringify(row.keywords ?? [])},
        ${JSON.stringify(row.metadata ?? {})}, ${row.content ?? null},
        ${row.error ?? null}, ${row.createdAt}, ${row.expiresAt ?? null}
      )`;
    return true;
  } catch (error) {
    console.error("[db/files] insert failed:", error);
    return false;
  }
}

export async function getFileDb(fileId: string, userId: string) {
  const db = getSql();
  if (!db) return null;
  try {
    const rows = await db<Record<string, unknown>[]>`
      SELECT ${db(LIST_COLUMNS)}, '/api/files/' || id || '/download' AS url
      FROM files WHERE id = ${fileId} AND user_id = ${userId}`;
    return rows.length > 0 ? rowToPublic(rows[0]) : null;
  } catch (error) {
    console.error("[db/files] get failed:", error);
    return null;
  }
}

/** Fetches content bytes + serving info for the download route. */
export async function getFileContentDb(
  fileId: string,
  userId: string
): Promise<{ content: Buffer; name: string; type: string | null } | null> {
  const db = getSql();
  if (!db) return null;
  try {
    const rows = await db`
      SELECT content, name, type FROM files
      WHERE id = ${fileId} AND user_id = ${userId} AND content IS NOT NULL`;
    if (rows.length === 0) return null;
    const row = rows[0] as { content: Buffer; name: string; type: string | null };
    return { content: row.content, name: row.name, type: row.type };
  } catch (error) {
    console.error("[db/files] getContent failed:", error);
    return null;
  }
}

export async function listFilesDb(userId: string, limit = 500) {
  const db = getSql();
  if (!db) return [];
  try {
    const rows = await db<Record<string, unknown>[]>`
      SELECT ${db(LIST_COLUMNS)}, '/api/files/' || id || '/download' AS url
      FROM files WHERE user_id = ${userId}
      ORDER BY created_at DESC LIMIT ${limit}`;
    return rows.map(rowToPublic);
  } catch (error) {
    console.error("[db/files] list failed:", error);
    return [];
  }
}

export async function searchFilesDb(userId: string, query: string, limit = 500) {
  const db = getSql();
  if (!db) return [];
  try {
    const pattern = `%${query}%`;
    const rows = await db<Record<string, unknown>[]>`
      SELECT ${db(LIST_COLUMNS)}, '/api/files/' || id || '/download' AS url
      FROM files
      WHERE user_id = ${userId}
        AND (
          name ILIKE ${pattern} OR summary ILIKE ${pattern}
          OR text ILIKE ${pattern} OR keywords::text ILIKE ${pattern}
        )
      ORDER BY created_at DESC LIMIT ${limit}`;
    return rows.map(rowToPublic);
  } catch (error) {
    console.error("[db/files] search failed:", error);
    return [];
  }
}

export async function deleteFileDb(fileId: string, userId: string): Promise<boolean> {
  const db = getSql();
  if (!db) return false;
  try {
    const result = await db`
      DELETE FROM files WHERE id = ${fileId} AND user_id = ${userId}`;
    return result.count > 0;
  } catch (error) {
    console.error("[db/files] delete failed:", error);
    return false;
  }
}

export async function deleteFilesDb(
  ids: string[],
  userId: string
): Promise<number> {
  const db = getSql();
  if (!db) return 0;
  if (ids.length === 0) return 0;
  try {
    const result = await db`
      DELETE FROM files WHERE id = ANY(${ids}) AND user_id = ${userId}`;
    return result.count;
  } catch (error) {
    console.error("[db/files] bulk delete failed:", error);
    return 0;
  }
}

export async function updateFileDb(
  fileId: string,
  userId: string,
  patch: {
    summary?: string;
    text?: string;
    facts?: string[];
    keywords?: string[];
    metadata?: FileMetadata;
    status?: FileStatus;
    error?: string | null;
  }
): Promise<boolean> {
  const db = getSql();
  if (!db) return false;
  try {
    await db`
      UPDATE files SET
        summary = ${patch.summary ?? null},
        text = ${patch.text ?? null},
        facts = ${JSON.stringify(patch.facts ?? [])},
        keywords = ${JSON.stringify(patch.keywords ?? [])},
        metadata = ${JSON.stringify(patch.metadata ?? {})},
        status = ${patch.status ?? "ready"},
        error = ${patch.error ?? null}
      WHERE id = ${fileId} AND user_id = ${userId}`;
    return true;
  } catch (error) {
    console.error("[db/files] update failed:", error);
    return false;
  }
}
