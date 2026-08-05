import JSZip from "jszip";

import type { FileMetadata } from "@/lib/file-types";

const MAX_ENTRIES = 100;
const MAX_ENTRY_SIZE = 5 * 1024 * 1024;

const TEXT_EXT = /\.(txt|md|js|mjs|ts|py|json|xml|csv|tsv|html|css|sql|log|yml|yaml|ini|env|sh|java|go|rs)$/i;

/**
 * Extracts ZIP archives and pulls text from text-like entries, concatenating
 * their contents. RAR is reported as unsupported (needs a system unrar tool).
 */
export async function processArchive(
  buffer: Buffer,
  extension: string
): Promise<{ text: string; metadata: FileMetadata }> {
  if (extension === "rar") {
    return {
      text: "",
      metadata: { warning: "RAR extraction requires a system unrar tool and is not supported." },
    };
  }

  try {
    const zip = await JSZip.loadAsync(buffer);
    const entries = Object.values(zip.files)
      .filter((entry) => !entry.dir)
      .slice(0, MAX_ENTRIES);

    const contents: string[] = [];
    const other: string[] = [];

    for (const entry of entries) {
      if (!TEXT_EXT.test(entry.name)) {
        other.push(entry.name);
        continue;
      }
      try {
        const content = await entry.async("string");
        if (content.length > MAX_ENTRY_SIZE) {
          other.push(`${entry.name} (skipped, too large)`);
          continue;
        }
        const trimmed = content.trim();
        if (trimmed) {
          contents.push(`--- ${entry.name} ---\n${trimmed.slice(0, 12000)}`);
        }
      } catch (error) {
        console.warn(`[file-processing] archive entry ${entry.name} failed:`, error);
        other.push(`${entry.name} (could not read)`);
      }
    }

    const text = [
      `Archive contains ${entries.length} entries.`,
      contents.length > 0 ? `Text contents:\n${contents.join("\n\n")}` : "",
      other.length > 0 ? `Other entries:\n${other.join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      text,
      metadata: {
        entries: entries.length,
        textFiles: contents.length,
      },
    };
  } catch (error) {
    console.warn("[file-processing] archive parse failed:", error);
    return {
      text: "",
      metadata: { warning: "Could not extract archive." },
    };
  }
}
