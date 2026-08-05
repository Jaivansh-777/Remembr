import { PDFParse } from "pdf-parse";

import type { FileMetadata } from "@/lib/file-types";

/**
 * Extracts text from a PDF buffer using pdf-parse v2.
 * Returns raw text + page count; empty on scanned (image-only) PDFs.
 */
export async function processPdf(
  buffer: Buffer
): Promise<{ text: string; metadata: FileMetadata }> {
  const parser = new PDFParse(buffer);
  try {
    const result = await parser.getText();
    const text = typeof result.text === "string" ? result.text : "";
    const pages = typeof result.total === "number" ? result.total : 0;

    let title: string | undefined;
    let author: string | undefined;
    try {
      const info = await parser.getInfo();
      if (typeof info.info?.Title === "string" && info.info.Title) {
        title = info.info.Title;
      }
      if (typeof info.info?.Author === "string" && info.info.Author) {
        author = info.info.Author;
      }
    } catch {
      /* metadata is optional */
    }

    return {
      text: text.trim(),
      metadata: { pages, title, author },
    };
  } catch (error) {
    console.warn("[file-processing] pdf parse failed:", error);
    return { text: "", metadata: { warning: "Could not extract text (may be a scanned PDF)." } };
  } finally {
    try {
      await parser.destroy();
    } catch {
      /* ignore */
    }
  }
}
