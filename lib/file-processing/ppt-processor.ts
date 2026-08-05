import JSZip from "jszip";

import type { FileMetadata } from "@/lib/file-types";

/**
 * Extracts text from PPTX/PPT zip archives: slide titles/bullets + speaker notes.
 * Legacy .ppt (binary) is not supported and is reported as such.
 */
export async function processPptx(
  buffer: Buffer,
  extension: string
): Promise<{ text: string; metadata: FileMetadata }> {
  if (extension !== "pptx") {
    return {
      text: "",
      metadata: { warning: "Legacy .ppt files are not supported; please re-save as .pptx." },
    };
  }

  try {
    const zip = await JSZip.loadAsync(buffer);
    const slideEntries = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => {
        const num = (path: string) => Number(/\/(\d+)\.xml$/.exec(path)?.[1] ?? 0);
        return num(a) - num(b);
      });

    const notes: string[] = [];
    const slides: { index: number; text: string }[] = [];

    for (const entry of slideEntries) {
      const xml = await zip.file(entry)?.async("string");
      if (!xml) continue;
      const text = extractSlideText(xml);
      slides.push({ index: slides.length + 1, text });
    }

    for (let i = 1; i <= slides.length; i += 1) {
      const noteEntry = zip.file(`ppt/notesSlides/notesSlide${i}.xml`);
      if (noteEntry) {
        const xml = await noteEntry.async("string");
        const note = extractSlideText(xml);
        if (note) notes.push(`Slide ${i} notes: ${note}`);
      }
    }

    const text = slides
      .map((slide) => `--- Slide ${slide.index} ---\n${slide.text}`)
      .join("\n\n");

    return {
      text,
      metadata: {
        slides: slides.length,
        notes: notes,
      },
    };
  } catch (error) {
    console.warn("[file-processing] pptx parse failed:", error);
    return { text: "", metadata: { warning: "Could not parse presentation." } };
  }
}

/** Strips the XML and joins <a:t> runs, preserving paragraph breaks. */
function extractSlideText(xml: string): string {
  const paragraphs: string[] = [];
  const paragraphMatches = xml.match(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g) ?? [];

  for (const paragraph of paragraphMatches) {
    const runs = paragraph.match(/<a:t>([\s\S]*?)<\/a:t>/g) ?? [];
    const line = runs
      .map((run) => run.replace(/<\/?a:t>/g, ""))
      .join("")
      .trim();
    if (line) paragraphs.push(line);
  }

  return paragraphs.join("\n");
}
