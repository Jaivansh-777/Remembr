import type { FileMetadata } from "@/lib/file-types";

const LANGUAGE_BY_EXT: Record<string, string> = {
  js: "JavaScript", mjs: "JavaScript", cjs: "JavaScript", jsx: "JavaScript (JSX)",
  ts: "TypeScript", tsx: "TypeScript (TSX)",
  py: "Python", rb: "Ruby", php: "PHP", go: "Go", rs: "Rust",
  java: "Java", kt: "Kotlin", c: "C", h: "C/C++ Header", cpp: "C++", cs: "C#",
  swift: "Swift", dart: "Dart", lua: "Lua", r: "R",
  html: "HTML", htm: "HTML", css: "CSS", scss: "SCSS", json: "JSON",
  xml: "XML", yml: "YAML", yaml: "YAML", sql: "SQL", sh: "Shell", bash: "Bash",
  toml: "TOML",
};

const FUNCTION_PATTERNS: Record<string, RegExp> = {
  js: /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(|class\s+(\w+))/g,
  jsx: /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(|class\s+(\w+))/g,
  ts: /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(|class\s+(\w+))/g,
  tsx: /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(|class\s+(\w+))/g,
  py: /^\s*(?:async\s+)?def\s+(\w+)|^\s*class\s+(\w+)/gm,
  java: /(?:public|private|protected)?\s*(?:static\s+)?[\w<>,\[\]]+\s+(\w+)\s*\(/g,
  go: /^func\s+(\w+)/gm,
  rs: /^\s*(?:pub\s+)?fn\s+(\w+)|^\s*(?:pub\s+)?(?:struct|enum|trait)\s+(\w+)/gm,
  rb: /^\s*def\s+(\w+)|^\s*class\s+(\w+)/gm,
  php: /function\s+(\w+)|class\s+(\w+)/g,
  cs: /(?:public|private|protected|internal)?\s*(?:static\s+)?[\w<>,\[\]]+\s+(\w+)\s*\(/g,
};

const DEPENDENCY_PATTERNS = [
  /^\s*(?:import|export)\s+.+?from\s+['"]([^'"]+)['"]/gm,
  /^\s*import\s+['"]([^'"]+)['"]/gm,
  /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  /^\s*import\s+(\w+)/gm,
];

/** Extracts code files: language detection, symbols, dependencies, red flags. */
export function processCode(
  buffer: Buffer,
  extension: string
): { text: string; metadata: FileMetadata } {
  const content = buffer.toString("utf8");
  const language = LANGUAGE_BY_EXT[extension] ?? "Text";

  const symbols = new Set<string>();
  const pattern = FUNCTION_PATTERNS[extension];
  if (pattern) {
    const matcher = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(content)) !== null) {
      const name = match.slice(1).find(Boolean);
      if (name) symbols.add(name);
    }
  }

  const dependencies = new Set<string>();
  for (const depPattern of DEPENDENCY_PATTERNS) {
    const matcher = new RegExp(depPattern.source, depPattern.flags);
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(content)) !== null) {
      if (match[1]) dependencies.add(match[1]);
    }
  }

  const redFlags: string[] = [];
  if (/TODO|FIXME|HACK/i.test(content)) redFlags.push("contains TODO/FIXME/HACK markers");
  if (/\bconsole\.log\b/g.test(content) && !/\.test\./.test(content)) {
    redFlags.push("contains console.log statements");
  }
  if (/import\s+\*\s+as\s+\w+\s+from\s+['"]lodash['"]/.test(content)) {
    redFlags.push("imports entire lodash (tree-shaking concern)");
  }

  return {
    text: content,
    metadata: {
      language,
      symbols: [...symbols].slice(0, 30),
      dependencies: [...dependencies].slice(0, 30),
      redFlags,
      lines: content.split("\n").length,
    },
  };
}
