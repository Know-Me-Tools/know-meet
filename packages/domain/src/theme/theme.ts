/** Know Meet colour themes. Dark is the token default; light is the alternate. */
export type Theme = "dark" | "light";

export function parseTheme(value: unknown): Theme | null {
  return value === "dark" || value === "light" ? value : null;
}

export function oppositeTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}
