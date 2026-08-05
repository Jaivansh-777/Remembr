import mammoth from "mammoth";

import type { FileMetadata } from "@/lib/file-types";

/** Extracts text from DOCX buffers via mammoth. */
export async function processDocx(
  buffer: Buffer
): Promise<{ text: string; metadata: FileMetadata }> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value.trim(),
      metadata: {},
    };
  } catch (error) {
    console.warn("[file-processing] docx parse failed:", error);
    return { text: "", metadata: { warning: "Could not extract DOCX text." } };
  }
}
