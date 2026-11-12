// TJ-ARCH-MOB-001 compliant
// c10 public routes: the composition layer hands the static session (km-auth)
// to the presentation screens as props, so the screens stay free of app wiring.
import { useNavigate } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { AuthScreen } from "../../presentation/auth/auth-screen";
import { HomeScreen } from "../../presentation/home/home-screen";
import { JoinScreen } from "../../presentation/join/join-screen";
import { useAppServices } from "../app-services";

function useSession() {
  const { session } = useAppServices();
  const user = useSyncExternalStore(session.subscribe, session.current);
  return { user, signOut: session.signOut };
}

export function HomeRoute() {
  const { user } = useSession();
  return <HomeScreen user={user} />;
}

export function AuthRoute() {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  return (
    <AuthScreen
      user={user}
      onSignOut={() => {
        signOut();
        void navigate({ to: "/auth", hash: "sign-in", replace: true });
      }}
    />
  );
}

export function JoinRoute() {
  return <JoinScreen />;
}
