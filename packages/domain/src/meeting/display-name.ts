/** The name a guest enters in the join lobby; other participants see it on their tile. */
export type DisplayName = string & { readonly __brand: "DisplayName" };

/** The token service's limit (release contract `NAME_MAX_LENGTH`), counted in code points. */
export const MAX_DISPLAY_NAME_LENGTH = 60;

/** Trims the input. Returns null when the result is empty or longer than the limit. */
export function parseDisplayName(value: unknown): DisplayName | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  const length = [...name].length;
  if (length === 0 || length > MAX_DISPLAY_NAME_LENGTH) return null;
  return name as DisplayName;
}
