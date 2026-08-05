import { processArchive } from "@/lib/file-processing/archive-processor";
import { processCode } from "@/lib/file-processing/code-processor";
import { processDocx } from "@/lib/file-processing/docx-processor";
import { processImage } from "@/lib/file-processing/image-processor";
import { processPdf } from "@/lib/file-processing/pdf-processor";
import { processPptx } from "@/lib/file-processing/ppt-processor";
import { processSpreadsheet } from "@/lib/file-processing/spreadsheet-processor";
import { analyzeContent } from "@/lib/file-processing/summarizer";
import {
  detectCategory,
  getExtension,
  type FileCategory,
  type ProcessedFile,
} from "@/lib/file-types";

export const TEXT_PLAIN_TYPES: Record<string, string> = {
  txt: "text/plain",
  md: "text/markdown",
  rtf: "application/rtf",
  json: "application/json",
  xml: "application/xml",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  yml: "text/yaml",
  yaml: "text/yaml",
  log: "text/plain",
};

/**
 * Detects the real MIME type from magic bytes so we don't trust the
 * client-supplied `type`. Falls back to name extension / provided mime.
 */
export function detectMimeType(
  buffer: Buffer,
  name: string,
  providedType?: string
): string {
  const bytes = buffer.subarray(0, 16);
  if (bytes.length >= 8) {
    if (bytes.readUInt32BE(0) === 0x89504e47) return "image/png";
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return "image/webp";
    if (bytes[0] === 0x42 && bytes[1] === 0x4d) return "image/bmp";
    if (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) return "image/tiff";
    if (bytes.readUInt32BE(0) === 0x25504446) return "application/pdf";
    if (
      bytes[0] === 0x50 && bytes[1] === 0x4b &&
      (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)
    ) {
      // PK: zip / docx / xlsx / pptx — differentiate via [Content_Types].xml
      return sniffOfficeFormat(buffer);
    }
    if (bytes[0] === 0x52 && bytes[1] === 0x61 && bytes[2] === 0x72 && bytes[3] === 0x21) return "application/x-rar-compressed";
    if (bytes.readUInt32BE(0) === 0xd0cf11e0) return "application/vnd.ms-office";
    if (bytes[0] === 0x25 && bytes[1] === 0x50) return "application/postscript";
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) return "application/gzip";
  }
  if (bytes.length >= 4 && bytes.toString("utf8").toLowerCase().startsWith("<?xml")) {
    const ext = getExtension(name);
    if (ext === "svg") return "image/svg+xml";
    return "application/xml";
  }
  if (providedType && providedType.startsWith("image/svg")) return "image/svg+xml";
  if (getExtension(name) === "svg") return "image/svg+xml";

  const ext = getExtension(name);
  if (TEXT_PLAIN_TYPES[ext]) return TEXT_PLAIN_TYPES[ext];
  return providedType ?? "application/octet-stream";
}

function sniffOfficeFormat(buffer: Buffer): string {
  const haystack = buffer.subarray(0, 256 * 1024).toString("latin1");
  if (haystack.includes("[Content_Types].xml")) {
    if (haystack.includes("wordprocessingml")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (haystack.includes("spreadsheetml")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (haystack.includes("presentationml")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  return "application/zip";
}

/** Routes a buffer to the right processor and runs AI analysis. */
export async function processFileBuffer(
  buffer: Buffer,
  name: string,
  providedType?: string
): Promise<ProcessedFile> {
  const mime = detectMimeType(buffer, name, providedType);
  const ext = getExtension(name);
  const category: FileCategory = detectCategory(name, mime);

  switch (category) {
    case "image": {
      const image = await processImage(buffer, mime);
      const analysis =
        image.summary && image.summary.trim()
          ? { summary: image.summary, facts: image.facts, keywords: image.keywords }
          : await analyzeContent(image.text, name, category);
      return {
        name,
        type: mime,
        category,
        size: buffer.byteLength,
        summary: analysis.summary,
        text: image.text,
        facts: analysis.facts,
        keywords: analysis.keywords,
        metadata: image.metadata,
      };
    }
    case "spreadsheet": {
      const sheet = processSpreadsheet(buffer);
      const analysis = await analyzeContent(sheet.text, name, category);
      return {
        name,
        type: mime,
        category,
        size: buffer.byteLength,
        summary: analysis.summary,
        text: sheet.text,
        facts: analysis.facts,
        keywords: analysis.keywords,
        metadata: sheet.metadata,
      };
    }
    case "presentation": {
      const ppt = await processPptx(buffer, ext);
      const analysis = await analyzeContent(ppt.text, name, category);
      return {
        name,
        type: mime,
        category,
        size: buffer.byteLength,
        summary: analysis.summary,
        text: ppt.text,
        facts: analysis.facts,
        keywords: analysis.keywords,
        metadata: ppt.metadata,
      };
    }
    case "code": {
      const code = processCode(buffer, ext);
      const language = String(code.metadata.language ?? "");
      const analysis = await analyzeContent(code.text, name, category, `Language: ${language}`);
      return {
        name,
        type: mime,
        category,
        size: buffer.byteLength,
        summary: analysis.summary,
        text: code.text,
        facts: analysis.facts,
        keywords: analysis.keywords,
        metadata: code.metadata,
      };
    }
    case "archive": {
      const archive = await processArchive(buffer, ext);
      const analysis = await analyzeContent(archive.text, name, category);
      return {
        name,
        type: mime,
        category,
        size: buffer.byteLength,
        summary: analysis.summary,
        text: archive.text,
        facts: analysis.facts,
        keywords: analysis.keywords,
        metadata: archive.metadata,
        warnings: typeof archive.metadata.warning === "string" ? [archive.metadata.warning] : undefined,
      };
    }
    case "document":
    default: {
      if (ext === "pdf") {
        const doc = await processPdf(buffer);
        const analysis = await analyzeContent(doc.text, name, category);
        return {
          name,
          type: mime,
          category,
          size: buffer.byteLength,
          summary: analysis.summary,
          text: doc.text,
          facts: analysis.facts,
          keywords: analysis.keywords,
          metadata: doc.metadata,
        };
      }
      if (ext === "docx") {
        const doc = await processDocx(buffer);
        const analysis = await analyzeContent(doc.text, name, category);
        return {
          name,
          type: mime,
          category,
          size: buffer.byteLength,
          summary: analysis.summary,
          text: doc.text,
          facts: analysis.facts,
          keywords: analysis.keywords,
          metadata: doc.metadata,
        };
      }
      const text = buffer.toString("utf8");
      const analysis = await analyzeContent(text, name, category);
      return {
        name,
        type: mime,
        category,
        size: buffer.byteLength,
        summary: analysis.summary,
        text,
        facts: analysis.facts,
        keywords: analysis.keywords,
        metadata: {},
      };
    }
  }
}

export { detectCategory };
