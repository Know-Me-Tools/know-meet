// TJ-ARCH-MOB-001 compliant
// The session of the hosted build: always signed out. It never touches storage, so a
// stored km-auth value cannot change what a visitor sees (WR-5).
import type { SessionSource } from "./local-session";

export function createSignedOutSession(): SessionSource {
  return {
    current: () => null,
    signOut: () => undefined,
    subscribe: () => () => undefined,
  };
}
