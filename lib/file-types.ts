/** Shared file types + constants. Client-safe (no server-only imports). */

export type FileCategory =
  | "image"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "code"
  | "archive";

export type FileStatus = "processing" | "ready" | "error";

export interface FileTierConfig {
  storageLimit: number;
  fileSizeLimit: number;
  expiryDays: number | null;
}

export const FILE_TIERS: Record<"free" | "pro" | "team", FileTierConfig> = {
  free: { storageLimit: 100 * 1024 * 1024, fileSizeLimit: 5 * 1024 * 1024, expiryDays: 30 },
  pro: { storageLimit: 1024 * 1024 * 1024, fileSizeLimit: 50 * 1024 * 1024, expiryDays: null },
  team: { storageLimit: 5 * 1024 * 1024 * 1024, fileSizeLimit: 100 * 1024 * 1024, expiryDays: null },
};

export type FileTierName = keyof typeof FILE_TIERS;

export function getFileTier(tier?: string | null): FileTierName {
  if (tier === "pro") return "pro";
  if (tier === "team") return "team";
  return "free";
}

export interface FileMetadata {
  /** e.g. page count for PDFs, row/col count for sheets, slide count for decks */
  [key: string]: unknown;
}

/** Result of server-side file processing. */
export interface ProcessedFile {
  name: string;
  /** detected MIME type */
  type: string;
  category: FileCategory;
  size: number;
  summary: string;
  /** extracted text content (truncated) */
  text: string;
  facts: string[];
  keywords: string[];
  metadata: FileMetadata;
  warnings?: string[];
}

/** Payload accepted by the client-side upload + process pipeline. */
export interface ProcessedFilePayload {
  fileId?: string;
  name: string;
  type: string;
  category: FileCategory;
  size: number;
  url?: string;
  status: FileStatus;
  error?: string;
  summary?: string;
  text?: string;
  facts?: string[];
  keywords?: string[];
  metadata?: FileMetadata;
  expiresAt?: number;
}

/** Persisted file record (Firestore `files/{fileId}`). */
export interface FileDoc {
  id: string;
  userId: string;
  projectId?: string | null;
  chatId?: string | null;
  name: string;
  url: string;
  /** storage path so we can delete the object later */
  path: string;
  type: string;
  size: number;
  category: FileCategory;
  status: FileStatus;
  error?: string;
  summary?: string;
  text?: string;
  facts?: string[];
  keywords?: string[];
  metadata?: FileMetadata;
  createdAt: number;
  expiresAt?: number | null;
}

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "heic"]);
const DOCUMENT_EXT = new Set(["pdf", "docx", "doc", "txt", "md", "rtf", "odt", "html", "htm"]);
const SPREADSHEET_EXT = new Set(["csv", "xlsx", "xls", "tsv", "ods"]);
const PRESENTATION_EXT = new Set(["pptx", "ppt", "odp"]);
const CODE_EXT = new Set([
  "js", "mjs", "cjs", "ts", "tsx", "jsx", "py", "html", "css", "scss", "json",
  "xml", "yml", "yaml", "sh", "bash", "java", "c", "cpp", "h", "cs", "go",
  "rs", "rb", "php", "sql", "swift", "kt", "dart", "lua", "r", "toml",
]);
const ARCHIVE_EXT = new Set(["zip", "rar", "tar", "gz", "7z"]);

export const ACCEPTED_EXTENSIONS = [
  ...IMAGE_EXT,
  ...DOCUMENT_EXT,
  ...SPREADSHEET_EXT,
  ...PRESENTATION_EXT,
  ...CODE_EXT,
  ...ARCHIVE_EXT,
];

export function getExtension(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toLowerCase() : "";
}

export function detectCategory(name: string, mime?: string): FileCategory {
  if (mime?.startsWith("image/")) return "image";
  const ext = getExtension(name);
  if (IMAGE_EXT.has(ext)) return "image";
  if (SPREADSHEET_EXT.has(ext)) return "spreadsheet";
  if (PRESENTATION_EXT.has(ext)) return "presentation";
  if (CODE_EXT.has(ext)) return "code";
  if (ARCHIVE_EXT.has(ext)) return "archive";
  if (mime === "application/pdf") return "document";
  if (ext === "docx" || ext === "doc" || ext === "rtf" || ext === "odt") return "document";
  return "document";
}

export function isSupportedFileName(name: string): boolean {
  return ACCEPTED_EXTENSIONS.includes(getExtension(name));
}

export function isImageType(type: string): boolean {
  return type.startsWith("image/");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Compact display name: strips directory paths and truncates long names,
 * preserving a short extension. Use this everywhere a filename is shown.
 */
export function shortFileName(name: string, maxLength = 22): string {
  if (!name) return name;
  const clean = name.split(/[\\/]/).pop() ?? name;
  if (clean.length <= maxLength) return clean;
  const dot = clean.lastIndexOf(".");
  const ext = dot > clean.length - 8 && dot > 0 ? clean.slice(dot) : "";
  const budget = maxLength - ext.length - 1;
  if (ext && budget > 4) {
    return `${clean.slice(0, budget)}…${ext}`;
  }
  return `${clean.slice(0, maxLength - 1)}…`;
}
