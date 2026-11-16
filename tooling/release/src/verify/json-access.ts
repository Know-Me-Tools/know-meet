/**
 * Narrowing helpers for parsed kubectl JSON. The shape of a cluster object is not
 * known to the compiler, so every read goes through a type guard instead of a cast.
 */
export type JsonObject = { readonly [key: string]: unknown };

export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function field(value: unknown, key: string): unknown {
  return isObject(value) ? value[key] : undefined;
}

/** Follows `keys` one object level at a time; `undefined` as soon as a level is missing. */
export function dig(value: unknown, ...keys: readonly string[]): unknown {
  let current = value;
  for (const key of keys) current = field(current, key);
  return current;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

/** The `items` of a kubectl List document. */
export function items(list: unknown): readonly unknown[] {
  return asArray(field(list, "items"));
}
