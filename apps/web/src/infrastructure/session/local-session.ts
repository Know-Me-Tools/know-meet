// TJ-ARCH-MOB-001 compliant
// Static signed-in state for the frame (contract exclusion: no real auth in this
// phase). Same storage contract as the prototype and the fidelity oracle
// (app-state-map.json `storage.auth`): localStorage km-auth = {"name","email"}.

export const SESSION_STORAGE_KEY = "km-auth";

export interface SessionUser {
  readonly name: string;
  readonly email: string;
  readonly initials: string;
}

export interface SessionSource {
  readonly current: () => SessionUser | null;
  readonly signOut: () => void;
  readonly subscribe: (listener: () => void) => () => void;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => part !== "");
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((part) => (part ?? "").charAt(0).toUpperCase()).join("");
}

/** Unparseable or partial values mean "signed out", as in km.js `auth.get()`. */
export function parseSessionUser(raw: string | null): SessionUser | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const name = "name" in value ? value.name : undefined;
  const email = "email" in value ? value.email : undefined;
  if (typeof name !== "string" || name.trim() === "" || typeof email !== "string") return null;
  return { name, email, initials: initialsOf(name) };
}

export function createLocalStorageSession(view: Window): SessionSource {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null = null;
  let cached: SessionUser | null = null;
  const read = (): string | null => {
    try {
      return view.localStorage.getItem(SESSION_STORAGE_KEY);
    } catch {
      return null;
    }
  };
  const notify = () => {
    for (const listener of listeners) listener();
  };
  view.addEventListener("storage", (event) => {
    if (event.key === SESSION_STORAGE_KEY || event.key === null) notify();
  });
  return {
    current: () => {
      const raw = read();
      if (raw !== cachedRaw) {
        cachedRaw = raw;
        cached = parseSessionUser(raw);
      }
      return cached;
    },
    signOut: () => {
      try {
        view.localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (error) {
        reportError(error);
      }
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
