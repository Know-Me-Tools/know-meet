// TJ-ARCH-MOB-001 compliant
import { useSyncExternalStore } from "react";
import { useAppServices } from "../app-services";

/** The static session (km-auth) from the composition root; signed out for good in the hosted build. */
export function useSession() {
  const { session } = useAppServices();
  const user = useSyncExternalStore(session.subscribe, session.current);
  return { user, signOut: session.signOut };
}
