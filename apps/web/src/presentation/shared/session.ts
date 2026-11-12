// TJ-ARCH-MOB-001 compliant
// Static signed-in state for the c11 screens (contract exclusion: no real auth in
// this phase). The port is structural so presentation never imports the
// infrastructure adapter; the composition root provides `services.session`
// (localStorage km-auth, app-state-map.json `storage.auth`).
import { createContext, use, useSyncExternalStore } from "react";

export interface SessionUserView {
  readonly name: string;
  readonly email: string;
  readonly initials: string;
}

export interface SessionPort {
  readonly current: () => SessionUserView | null;
  readonly subscribe: (listener: () => void) => () => void;
  readonly signOut: () => void;
}

export const SessionContext = createContext<SessionPort | null>(null);

/** The signed-in user, or null when km-auth is absent (the screens render their gate). */
export function useSessionUser(): SessionUserView | null {
  const session = use(SessionContext);
  if (session === null) throw new Error("SessionContext is not provided");
  return useSyncExternalStore(session.subscribe, session.current);
}

/** Clears km-auth; every screen re-renders to its signed-out state. */
export function useSignOut(): () => void {
  const session = use(SessionContext);
  if (session === null) throw new Error("SessionContext is not provided");
  return session.signOut;
}
