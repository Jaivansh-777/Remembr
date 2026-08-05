import * as XLSX from "xlsx";

import type { FileMetadata } from "@/lib/file-types";

interface SheetSummary {
  name: string;
  rows: number;
  columns: number;
  headers: string[];
  stats: Record<string, { sum: number; avg: number; min: number; max: number }>;
  sample: string[];
}

/** Parses XLSX/XLS/CSV buffers and computes summary statistics + sample rows. */
export function processSpreadsheet(buffer: Buffer): { text: string; metadata: FileMetadata } {
  try {
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
    });

    const sheets: SheetSummary[] = workbook.SheetNames.slice(0, 10).map(
      (name) => {
        const sheet = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
        });

        const headers: string[] =
          rows.length > 0
            ? Object.keys(rows[0])
            : (XLSX.utils.sheet_to_json<unknown[]>(sheet, {
                header: 1,
                defval: "",
                raw: false,
              })[0] ?? []).map((h) => String(h ?? ""));

        const stats: SheetSummary["stats"] = {};
        for (const header of headers) {
          const numeric = rows
            .map((row) => row[header])
            .filter(
              (value): value is number =>
                typeof value === "number" ||
                (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)))
            )
            .map((value) => (typeof value === "number" ? value : Number(value)));
          if (numeric.length >= 2) {
            stats[header] = {
              sum: round(numeric.reduce((a, b) => a + b, 0)),
              avg: round(numeric.reduce((a, b) => a + b, 0) / numeric.length),
              min: round(Math.min(...numeric)),
              max: round(Math.max(...numeric)),
            };
          }
        }

        const sample = rows.slice(0, 8).map((row) =>
          headers
            .map((header) => `${header}: ${String(row[header] ?? "")}`)
            .join(" | ")
        );

        return {
          name,
          rows: rows.length,
          columns: headers.length,
          headers,
          stats,
          sample,
        };
      }
    );

    const text = buildSheetText(sheets);
    const totalRows = sheets.reduce((sum, sheet) => sum + sheet.rows, 0);
    const totalColumns = sheets.reduce((sum, sheet) => sum + sheet.columns, 0);

    return {
      text,
      metadata: {
        sheets: sheets.length,
        sheetNames: sheets.map((sheet) => sheet.name),
        rows: totalRows,
        columns: totalColumns,
        headers: sheets[0]?.headers ?? [],
        stats: sheets[0]?.stats ?? {},
      },
    };
  } catch (error) {
    console.warn("[file-processing] spreadsheet parse failed:", error);
    return { text: "", metadata: { warning: "Could not parse spreadsheet." } };
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildSheetText(sheets: SheetSummary[]): string {
  const parts: string[] = [];
  for (const sheet of sheets) {
    parts.push(`--- Sheet: ${sheet.name} (${sheet.rows} rows × ${sheet.columns} cols) ---`);
    parts.push(`Headers: ${sheet.headers.join(", ")}`);
    const statLines = Object.entries(sheet.stats)
      .slice(0, 6)
      .map(
        ([header, s]) =>
          `${header}: sum=${s.sum}, avg=${s.avg}, min=${s.min}, max=${s.max}`
      );
    if (statLines.length > 0) parts.push(`Stats: ${statLines.join("; ")}`);
    if (sheet.sample.length > 0) {
      parts.push(`Sample rows:\n${sheet.sample.join("\n")}`);
    }
  }
  return parts.join("\n");
}
