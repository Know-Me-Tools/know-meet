/**
 * RFC 6902 JSON Patch over immutable JSON values (RFC 6901 pointers with the
 * `-` append token). Returns a Result instead of throwing; the input is never
 * mutated.
 */
import type { PatchOperation } from "./agui-event.ts";

export type PatchResult = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly error: string };

type Container = Readonly<Record<string, unknown>> | readonly unknown[];

function parsePointer(pointer: string): readonly string[] | null {
  if (pointer === "") return [];
  if (!pointer.startsWith("/")) return null;
  return pointer
    .slice(1)
    .split("/")
    .map((t) => t.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function isContainer(value: unknown): value is Container {
  return typeof value === "object" && value !== null;
}

function arrayIndex(token: string, length: number, allowEnd: boolean): number | null {
  if (token === "-") return allowEnd ? length : null;
  if (!/^(0|[1-9][0-9]*)$/.test(token)) return null;
  const index = Number(token);
  return index <= (allowEnd ? length : length - 1) ? index : null;
}

function getAt(doc: unknown, tokens: readonly string[]): { found: boolean; value: unknown } {
  let cur: unknown = doc;
  for (const token of tokens) {
    if (Array.isArray(cur)) {
      const i = arrayIndex(token, cur.length, false);
      if (i === null) return { found: false, value: undefined };
      cur = cur[i];
    } else if (isContainer(cur) && Object.hasOwn(cur, token)) {
      cur = (cur as Readonly<Record<string, unknown>>)[token];
    } else {
      return { found: false, value: undefined };
    }
  }
  return { found: true, value: cur };
}

type Edit = (parent: unknown, key: string) => PatchResult;

/** Rebuilds the path to the parent of `tokens`, applying `edit` at the leaf. */
function updateAt(doc: unknown, tokens: readonly string[], edit: Edit): PatchResult {
  const [head, ...rest] = tokens;
  if (head === undefined) return { ok: false, error: "root has no parent" };
  if (rest.length === 0) return edit(doc, head);
  const child = getAt(doc, [head]);
  if (!child.found) return { ok: false, error: `path segment ${head} not found` };
  const inner = updateAt(child.value, rest, edit);
  if (!inner.ok) return inner;
  return setChild(doc, head, inner.value, "replace");
}

function setChild(parent: unknown, key: string, value: unknown, mode: "add" | "replace"): PatchResult {
  if (Array.isArray(parent)) {
    const i = arrayIndex(key, parent.length, mode === "add");
    if (i === null) return { ok: false, error: `bad array index ${key}` };
    const next = [...parent];
    if (mode === "add") next.splice(i, 0, value);
    else next[i] = value;
    return { ok: true, value: next };
  }
  if (!isContainer(parent)) return { ok: false, error: "parent is not a container" };
  if (mode === "replace" && !Object.hasOwn(parent, key)) return { ok: false, error: `missing key ${key}` };
  return { ok: true, value: { ...parent, [key]: value } };
}

function removeChild(parent: unknown, key: string): PatchResult {
  if (Array.isArray(parent)) {
    const i = arrayIndex(key, parent.length, false);
    if (i === null) return { ok: false, error: `bad array index ${key}` };
    return { ok: true, value: parent.filter((_, idx) => idx !== i) };
  }
  if (!isContainer(parent) || !Object.hasOwn(parent, key)) return { ok: false, error: `missing key ${key}` };
  const { [key]: _removed, ...rest } = parent as Readonly<Record<string, unknown>>;
  return { ok: true, value: rest };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (isContainer(value)) {
    const obj = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function applyOne(doc: unknown, op: PatchOperation): PatchResult {
  const tokens = parsePointer(op.path);
  if (tokens === null) return { ok: false, error: `bad pointer ${op.path}` };
  switch (op.op) {
    case "add":
      return tokens.length === 0 ? { ok: true, value: op.value } : updateAt(doc, tokens, (p, k) => setChild(p, k, op.value, "add"));
    case "replace":
      return tokens.length === 0 ? { ok: true, value: op.value } : updateAt(doc, tokens, (p, k) => setChild(p, k, op.value, "replace"));
    case "remove":
      return updateAt(doc, tokens, removeChild);
    case "test": {
      const at = getAt(doc, tokens);
      return at.found && canonical(at.value) === canonical(op.value) ? { ok: true, value: doc } : { ok: false, error: `test failed at ${op.path}` };
    }
    case "copy":
    case "move": {
      const fromTokens = parsePointer(op.from ?? "");
      if (fromTokens === null || op.from === undefined) return { ok: false, error: "missing from" };
      const source = getAt(doc, fromTokens);
      if (!source.found) return { ok: false, error: `from ${op.from} not found` };
      const base = op.op === "move" ? updateAt(doc, fromTokens, removeChild) : { ok: true as const, value: doc };
      if (!base.ok) return base;
      return tokens.length === 0 ? { ok: true, value: source.value } : updateAt(base.value, tokens, (p, k) => setChild(p, k, source.value, "add"));
    }
  }
}

/** Applies every operation in order; the first failure aborts the whole patch. */
export function applyPatch(doc: unknown, ops: readonly PatchOperation[]): PatchResult {
  let cur: unknown = doc;
  for (const op of ops) {
    const next = applyOne(cur, op);
    if (!next.ok) return next;
    cur = next.value;
  }
  return { ok: true, value: cur };
}
