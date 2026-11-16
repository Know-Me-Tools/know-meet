/**
 * A reader for the YAML that `kustomize build` and hand-written Kubernetes manifests use:
 * block mappings and sequences (a sequence may sit at the same indentation as its key),
 * plain, quoted and block scalars, `{}` and `[]`, JSON-style flow collections and `---`
 * documents. It has no dependency because tooling/ has no package manifest.
 *
 * A quoted scalar may continue on more-indented lines, as `kustomize build` writes long
 * header values; the lines are folded with single spaces, as YAML folds them.
 *
 * It fails closed: anchors, aliases, tags, tab indentation, multi-line flow collections,
 * multi-line plain scalars, backslash line continuations and unexpected indentation throw
 * a ScanError (exit 2) instead of being guessed.
 * A manifest the scan cannot read is never a pass.
 */
import { ScanError } from "./model.ts";

export type Yaml = string | null | Yaml[] | { [key: string]: Yaml };

const UNSUPPORTED = "ERROR manifests-unsupported-yaml a manifest uses YAML the scan cannot read";

function unsupported(): ScanError {
  return new ScanError(UNSUPPORTED);
}

function emptyMap(): { [key: string]: Yaml } {
  return Object.create(null) as { [key: string]: Yaml };
}

/** Working copy of one document's lines. Sequence items are rewritten in place. */
class Cursor {
  readonly lines: string[];
  pos = 0;

  constructor(lines: string[]) {
    this.lines = lines;
  }

  /** Index of the next line that is neither blank nor a comment, or -1. */
  peek(): number {
    for (let i = this.pos; i < this.lines.length; i += 1) {
      const text = (this.lines[i] ?? "").trim();
      if (text !== "" && !text.startsWith("#")) return i;
    }
    return -1;
  }

  line(index: number): string {
    return this.lines[index] ?? "";
  }
}

function indentOf(line: string): number {
  const leading = /^[ \t]*/.exec(line)?.[0] ?? "";
  if (leading.includes("\t")) throw unsupported();
  return leading.length;
}

function isSeqItem(body: string): boolean {
  return body === "-" || body.startsWith("- ");
}

/** Removes a trailing ` # comment` that is not inside quotes. */
function stripComment(text: string): string {
  let single = false;
  let double = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (double && ch === "\\") {
      i += 1;
    } else if (ch === '"' && !single) {
      double = !double;
    } else if (ch === "'" && !double) {
      single = !single;
    } else if (ch === "#" && !single && !double && (i === 0 || /\s/.test(text[i - 1] ?? ""))) {
      return text.slice(0, i).trimEnd();
    }
  }
  return text.trimEnd();
}

/** Index of the quote that closes the one at `start`, or -1. */
function closingQuote(text: string, start: number): number {
  const quote = text[start];
  for (let i = start + 1; i < text.length; i += 1) {
    if (quote === '"' && text[i] === "\\") i += 1;
    else if (text[i] === quote) {
      if (quote === "'" && text[i + 1] === "'") i += 1;
      else return i;
    }
  }
  return -1;
}

function fromJson(value: unknown): Yaml {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(fromJson);
  if (typeof value === "object") {
    const out = emptyMap();
    for (const [key, item] of Object.entries(value)) out[key] = fromJson(item);
    return out;
  }
  return String(value);
}

function parseScalar(text: string): Yaml {
  const first = text[0];
  if (first === '"') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
    if (typeof parsed === "string") return parsed;
    if (text.length >= 2 && text.endsWith('"')) return text.slice(1, -1);
    throw unsupported();
  }
  if (first === "'") {
    if (text.length < 2 || !text.endsWith("'")) throw unsupported();
    return text.slice(1, -1).replaceAll("''", "'");
  }
  if (first === "{" || first === "[") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw unsupported();
    }
    return fromJson(parsed);
  }
  if (first === "&" || first === "*" || first === "!") throw unsupported();
  return text === "~" || text === "null" ? null : text;
}

/** Splits `key: rest`. Returns null when the text is not a mapping entry. */
function splitEntry(body: string): { key: string; rest: string } | null {
  const text = stripComment(body);
  const first = text[0];
  if (first === '"' || first === "'") {
    const end = closingQuote(text, 0);
    if (end < 0) return null;
    let i = end + 1;
    while (text[i] === " ") i += 1;
    if (text[i] !== ":" || (text[i + 1] !== undefined && text[i + 1] !== " ")) return null;
    const key = parseScalar(text.slice(0, end + 1));
    if (typeof key !== "string") throw unsupported();
    return { key, rest: text.slice(i + 1).trim() };
  }
  if (first === undefined || "{[&*!|>#".includes(first)) return null;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === ":" && (i === text.length - 1 || text[i + 1] === " ")) {
      const key = text.slice(0, i).trim();
      if (key === "<<") throw unsupported();
      return { key, rest: text.slice(i + 1).trim() };
    }
  }
  return null;
}

function parseBlockScalar(cur: Cursor, parentIndent: number): Yaml {
  const parts: string[] = [];
  let index = cur.pos;
  while (index < cur.lines.length) {
    const line = cur.line(index);
    if (line.trim() === "") {
      parts.push("");
    } else if (indentOf(line) > parentIndent) {
      parts.push(line.trim());
    } else {
      break;
    }
    index += 1;
  }
  cur.pos = index;
  return parts.join("\n").trim();
}

/**
 * A quoted scalar that does not close on its first line. Continuation lines must be more
 * indented than `parentIndent`; they are folded with one space, and a blank line becomes a
 * line break. Returns the complete quoted text for parseScalar.
 */
function readQuotedContinuation(cur: Cursor, first: string, parentIndent: number): string {
  const quote = first[0];
  let text = first;
  while (closingQuote(text, 0) < 0) {
    if (quote === '"' && text.endsWith("\\")) throw unsupported();
    const index = cur.pos;
    if (index >= cur.lines.length) throw unsupported();
    const line = cur.line(index);
    cur.pos = index + 1;
    if (line.trim() === "") {
      text += "\n";
      continue;
    }
    if (indentOf(line) <= parentIndent) throw unsupported();
    text += `${text.endsWith("\n") ? "" : " "}${line.trim()}`;
  }
  const end = closingQuote(text, 0);
  if (stripComment(text.slice(end + 1)).trim() !== "") throw unsupported();
  return text.slice(0, end + 1);
}

/** The value after `key:` (or after `- `), with `cur.pos` already past that line. */
function parseValue(cur: Cursor, restRaw: string, parentIndent: number): Yaml {
  const rest = stripComment(restRaw);
  if (rest === "") {
    const index = cur.peek();
    if (index < 0) return null;
    const next = cur.line(index);
    const nextIndent = indentOf(next);
    if (nextIndent > parentIndent) return parseNode(cur, parentIndent + 1);
    if (nextIndent === parentIndent && isSeqItem(next.trim())) return parseSeq(cur, parentIndent);
    return null;
  }
  if (rest[0] === "|" || rest[0] === ">") return parseBlockScalar(cur, parentIndent);
  if ((rest[0] === "'" || rest[0] === '"') && closingQuote(rest, 0) < 0) {
    return parseScalar(readQuotedContinuation(cur, rest, parentIndent));
  }
  return parseScalar(rest);
}

function parseMap(cur: Cursor, indent: number): Yaml {
  const out = emptyMap();
  for (;;) {
    const index = cur.peek();
    if (index < 0) break;
    const line = cur.line(index);
    const lineIndent = indentOf(line);
    if (lineIndent < indent) break;
    if (lineIndent > indent) throw unsupported();
    const body = line.trim();
    if (isSeqItem(body)) break;
    const entry = splitEntry(body);
    if (entry === null) throw unsupported();
    cur.pos = index + 1;
    out[entry.key] = parseValue(cur, entry.rest, indent);
  }
  return out;
}

function parseSeq(cur: Cursor, indent: number): Yaml {
  const out: Yaml[] = [];
  for (;;) {
    const index = cur.peek();
    if (index < 0) break;
    const line = cur.line(index);
    if (indentOf(line) !== indent || !isSeqItem(line.trim())) break;
    const afterDash = line.trim().slice(1);
    const rest = afterDash.trimStart();
    const column = indent + 1 + (afterDash.length - rest.length);
    if (rest === "" || rest.startsWith("#")) {
      cur.pos = index + 1;
      out.push(parseNode(cur, indent + 1));
    } else if (isSeqItem(rest) || splitEntry(rest) !== null) {
      // Rewrite the item so the nested block sees its real column.
      cur.lines[index] = `${" ".repeat(column)}${rest}`;
      cur.pos = index;
      out.push(parseNode(cur, column));
    } else {
      cur.pos = index + 1;
      out.push(parseValue(cur, rest, indent));
    }
  }
  return out;
}

function parseNode(cur: Cursor, minIndent: number): Yaml {
  const index = cur.peek();
  if (index < 0) return null;
  const line = cur.line(index);
  const indent = indentOf(line);
  if (indent < minIndent) return null;
  const body = line.trim();
  if (isSeqItem(body)) return parseSeq(cur, indent);
  if (splitEntry(body) !== null) return parseMap(cur, indent);
  cur.pos = index + 1;
  return parseScalar(stripComment(body));
}

function splitDocuments(text: string): string[][] {
  const documents: string[][] = [[]];
  for (const line of text.split(/\r?\n/)) {
    if (/^---(\s|$)/.test(line)) {
      const rest = stripComment(line.slice(3)).trim();
      if (rest !== "") throw unsupported();
      documents.push([]);
    } else if (!/^\.\.\.(\s|$)/.test(line)) {
      documents[documents.length - 1]?.push(line);
    }
  }
  return documents;
}

/** Parses every non-empty document of `text`. */
export function parseYamlDocuments(text: string): Yaml[] {
  const parsed: Yaml[] = [];
  for (const lines of splitDocuments(text)) {
    const cur = new Cursor(lines);
    if (cur.peek() < 0) continue;
    const root = parseNode(cur, 0);
    if (cur.peek() >= 0) throw unsupported();
    parsed.push(root);
  }
  return parsed;
}
